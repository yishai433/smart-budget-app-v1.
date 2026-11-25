import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Search, Plus, Minus, ChevronDown, Trophy } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import useScrollLock from '../../hooks/useScrollLock'
import useKeyboardHeight from '../../hooks/useVisibleViewport'
import { formatAmount } from '../../utils/format'
import { askPriceServer } from '../../utils/priceApi'
import { loadPriceIndex, prepareIndex, searchLocal } from '../../utils/priceIndex'

const money = (n, cur) => <span dir="ltr" className="num">{formatAmount(n, cur)}</span>

const ResultRow = memo(function ResultRow({ p, cur, labels, onAdd }) {
  const keys = Object.keys(p.prices)
  const cheapest = keys.reduce((a, b) => (p.prices[b] < p.prices[a] ? b : a), keys[0])
  const where = (labels && labels[cheapest]) || 'סניף'
  const sub = keys.length > 1 ? `הכי זול ב${where} · מתוך ${keys.length} סניפים` : where
  return (
    <button onClick={() => onAdd(p)} className="list-item"
      style={{ width: '100%', border: 'none', textAlign: 'start', fontFamily: 'inherit', padding: '10px 14px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'end' }}>
        {keys.length > 1 && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>החל מ-</div>}
        <div style={{ fontSize: 15, fontWeight: 700 }}>{money(p.min, cur)}</div>
      </div>
      <Plus size={18} color="var(--c-primary)" strokeWidth={2.4} />
    </button>
  )
})

// Plan a food basket, then see which branch is cheapest for the whole basket.
export default function BasketCompare({ onClose, onAddToList }) {
  useScrollLock()
  const { activeHouseholdId, user, settings } = useApp()
  const cur = settings.currency
  const storeKey = `sb-basket-${activeHouseholdId}`
  const saved = useRef((() => { try { return JSON.parse(localStorage.getItem(storeKey)) || {} } catch { return {} } })())
  // each line keeps every branch's price, so the totals are computed here, instantly
  const [basket, setBasket] = useState(() => Array.isArray(saved.current.lines) ? saved.current.lines : [])
  const [labels, setLabels] = useState(() => saved.current.labels || {})
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)       // null = not searched yet
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [branches, setBranches] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [open, setOpen] = useState(null)              // expanded branch key
  const [prepared, setPrepared] = useState(null)      // on-device product index (instant search)
  const reqN = useRef(0)
  const lastResults = useRef([])                 // previous server answer, filtered locally while the next one loads

  const kb = useKeyboardHeight()
  // Like native apps: dragging the results closes the keyboard, so the whole list is visible and scrolls normally.
  // (With the keyboard open, iOS pans the page instead of scrolling the list.)
  const inputRef = useRef(null)
  const touchY = useRef(null)
  const onListTouchStart = (e) => { touchY.current = e.touches[0]?.clientY ?? null }
  const onListTouchMove = (e) => {
    if (touchY.current == null || document.activeElement !== inputRef.current) return
    if (Math.abs((e.touches[0]?.clientY ?? 0) - touchY.current) > 8) { touchY.current = null; inputRef.current?.blur() }
  }

  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify({ lines: basket, labels })) } catch { /* private mode */ } }, [basket, labels, storeKey])

  // download the product index once; after that every search is instant and offline
  useEffect(() => {
    let alive = true
    loadPriceIndex(activeHouseholdId).then(idx => {
      if (!alive || !idx) return
      setPrepared(prepareIndex(idx))
      setBranches(idx.keys.length)
      setLabels(l => ({ ...l, ...idx.labels }))
      // refresh the saved basket's prices from today's index, no server round-trip
      const byCode = new Map(idx.items.map(([code, , prices]) => [code, prices]))
      setBasket(b => b.map(x => {
        const pr = byCode.get(x.code)
        if (!pr) return x
        const prices = {}
        pr.forEach((p, i) => { if (p != null) prices[idx.keys[i]] = p })
        return { ...x, prices }
      }))
    }).catch(() => {})
    return () => { alive = false }
  }, [activeHouseholdId])

  // search as you type — instant from the on-device index, server as a fallback until it downloads
  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) { setResults(null); setSearching(false); setErr(''); return }
    if (prepared) { setSearching(false); setErr(''); setResults(searchLocal(prepared, t)); return }
    const n = ++reqN.current
    setSearching(true)
    const words = t.toLowerCase().split(/\s+/)
    const local = lastResults.current.filter(p => words.every(w => p.name.toLowerCase().includes(w)))
    if (local.length) setResults(local)
    const id = setTimeout(async () => {
      try {
        const d = await askPriceServer(activeHouseholdId, user?.uid, { type: 'search', q: t })
        if (n !== reqN.current) return
        lastResults.current = d.products || []
        setResults(d.products || []); setBranches(d.branches || 0); setPreparing(!!d.preparing); setErr('')
        if (d.labels) setLabels(l => ({ ...l, ...d.labels }))
      } catch { if (n === reqN.current) { setErr('השרת הביתי לא ענה בזמן. בדוק שהוא פועל.'); setResults([]) } }
      finally { if (n === reqN.current) setSearching(false) }
    }, 200)
    return () => clearTimeout(id)
  }, [q, prepared, activeHouseholdId, user?.uid])

  // if there is no index yet (old server), refresh the saved basket's prices from the server once
  useEffect(() => {
    if (prepared || !basket.length) return
    let alive = true
    setRefreshing(true)
    askPriceServer(activeHouseholdId, user?.uid, { type: 'basket', items: basket.map(b => ({ code: b.code, qty: 1 })) })
      .then(d => {
        if (!alive) return
        const fresh = {}
        for (const r of d.compare || []) for (const [code, price] of Object.entries(r.prices || {})) (fresh[code] ||= {})[r.key] = price
        setBasket(b => b.map(x => ({ ...x, prices: fresh[x.code] || {} })))
        if (d.labels) setLabels(d.labels)
        setPreparing(!!d.preparing)
      })
      .catch(() => {})
      .finally(() => { if (alive) setRefreshing(false) })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared])

  const add = useCallback((p) => {
    setBasket(b => b.some(x => x.code === p.code) ? b.map(x => x.code === p.code ? { ...x, qty: x.qty + 1 } : x) : [...b, { code: p.code, name: p.name, qty: 1, prices: p.prices }])
    setQ(''); setResults(null)
    document.activeElement?.blur?.()
  }, [])
  const setQty = (code, d) => setBasket(b => b.flatMap(x => x.code !== code ? [x] : (x.qty + d <= 0 ? [] : [{ ...x, qty: Math.min(99, x.qty + d) }])))
  const remove = (code) => setBasket(b => b.filter(x => x.code !== code))

  // totals per branch, computed right here from the prices saved with each line
  const ranked = useMemo(() => {
    const keys = Object.keys(labels).filter(k => basket.some(b => b.prices?.[k] != null))
    return keys.map(key => {
      let total = 0
      const prices = {}, missing = []
      for (const b of basket) {
        const pr = b.prices?.[key]
        if (pr == null) { missing.push(b.code); continue }
        prices[b.code] = pr
        total += pr * b.qty
      }
      return { key, label: labels[key], total: Math.round(total * 100) / 100, missing, prices }
    }).sort((a, b) => (a.missing.length - b.missing.length) || (a.total - b.total))
  }, [basket, labels])
  const complete = ranked.filter(r => r.missing.length === 0)
  const best = complete[0]
  const worst = complete.length > 1 ? complete[complete.length - 1] : null

  const addAll = () => {
    if (!best) return
    onAddToList(basket.map(b => ({ name: b.name, qty: b.qty, price: best.prices[b.code] || 0 })))
    onClose()
  }

  return createPortal((
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="sheet-viewport">
        <motion.div className="sheet" style={{ height: 'calc(100% - var(--safe-top) - 28px)' }}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">השוואת סל</h2>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label="סגירה"><X size={17} strokeWidth={2} /></button>
          </div>

          <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', insetInlineStart: 14, top: 15, color: 'var(--c-text2)' }} />
              <input ref={inputRef} className="input-field" style={{ paddingInlineStart: 40 }} placeholder="הוסף מוצר, למשל חלב"
                name="basket-product" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                inputMode="search" enterKeyHint="search" data-form-type="other" data-lpignore="true" data-no-refocus="1"
                value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
            </div>
            {q.trim().length >= 2 && results?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--c-text2)' }}>
                <span style={{ flex: 1 }}>נמצאו {results.length} מוצרים{results.length > 3 ? ' · גרור את הרשימה לראות עוד' : ''}</span>
                {kb > 0 && (
                  <button onClick={() => document.activeElement?.blur?.()} className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: 12, minHeight: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ChevronDown size={14} /> הסתר מקלדת
                  </button>
                )}
              </div>
            )}
          </div>

          <div onTouchStart={onListTouchStart} onTouchMove={onListTouchMove}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: `0 20px ${kb + 90}px`, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', alignContent: 'start', gap: 14 }}>
            {err && <div style={{ fontSize: 13, color: 'var(--c-danger, #b3261e)' }}>{err}</div>}
            {preparing && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>מחירי חלק מהסניפים שבחרת עדיין נטענים בשרת. התוצאות יתעדכנו בעוד כדקה.</div>}

            {q.trim().length >= 2 ? (
              <>
                {searching && <div style={{ fontSize: 13, color: 'var(--c-text2)', padding: '8px 0' }}>מחפש…</div>}
                {!searching && results && !results.length && !err && (
                  <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>לא נמצא מוצר כזה בסניפים שבחרת. נסה מילה אחרת.</div>
                )}
                {results?.length > 0 && <div className="card-list">{results.map(p => <ResultRow key={p.code} p={p} cur={cur} labels={labels} onAdd={add} />)}</div>}
              </>
            ) : (
              <>
                {!basket.length && (
                  <div style={{ fontSize: 14, color: 'var(--c-text2)', lineHeight: 1.6, padding: '8px 0' }}>
                    כתוב שם מוצר למעלה והוסף אותו לסל. אחרי שתוסיף כמה מוצרים, תראה באיזה סניף כל הסל יוצא הכי זול.
                    {branches > 0 ? ` ההשוואה היא בין ${branches} הסניפים שבחרת בהגדרות.` : ''}
                  </div>
                )}

                {basket.length > 0 && (
                  <div className="card-list">
                    {basket.map(b => (
                      <div key={b.code} className="list-item">
                        <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>{b.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => setQty(b.code, -1)} className="btn-icon" style={{ width: 30, height: 30 }} aria-label="פחות">{b.qty === 1 ? <X size={14} /> : <Minus size={14} />}</button>
                          <span className="num" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{b.qty}</span>
                          <button onClick={() => setQty(b.code, 1)} className="btn-icon" style={{ width: 30, height: 30 }} aria-label="יותר"><Plus size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {basket.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)' }}>
                      איפה זול יותר {refreshing && <span style={{ fontWeight: 400 }}>· מעדכן מחירים…</span>}
                    </div>
                    {ranked.map(r => {
                      const isBest = best && r.key === best.key
                      const full = r.missing.length === 0
                      return (
                        <div key={r.key} className="card" style={isBest ? { border: '1.5px solid var(--c-primary)' } : undefined}>
                          <button onClick={() => setOpen(open === r.key ? null : r.key)}
                            style={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isBest && <Trophy size={15} color="var(--c-primary)" />}{r.label}
                              </div>
                              <div style={{ fontSize: 12, color: full ? 'var(--c-text2)' : 'var(--c-remaining)' }}>
                                {isBest && worst ? `חיסכון של ${formatAmount(worst.total - r.total, cur)} לעומת הסניף היקר` : full ? 'כל המוצרים קיימים' : `חסרים ${r.missing.length} מוצרים, הסכום לא כולל אותם`}
                              </div>
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 700 }}>{money(r.total, cur)}</div>
                            <ChevronDown size={16} style={{ transform: open === r.key ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                          </button>
                          {open === r.key && (
                            <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                              {basket.map(b => (
                                <div key={b.code} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: r.prices[b.code] == null ? 'var(--c-remaining)' : undefined }}>
                                  <span style={{ flex: 1, minWidth: 0 }}>{b.name}{b.qty > 1 ? ` × ${b.qty}` : ''}</span>
                                  <span>{r.prices[b.code] == null ? 'לא נמצא' : money(r.prices[b.code] * b.qty, cur)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {!ranked.length && !refreshing && !err && <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>אין עדיין מחירים בסניפים שבחרת.</div>}
                    <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>המחירים לפי קובץ הבוקר של כל סניף, בלי מבצעי מועדון. מחיר המדף בחנות הוא הקובע.</div>
                  </div>
                )}
              </>
            )}
          </div>

          {basket.length > 0 && q.trim().length < 2 && (
            <div className="sheet-footer" style={{ padding: `10px 20px ${kb ? 10 : 'calc(10px + var(--safe-bottom))'}`, transform: `translateY(${-kb}px)`, position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setBasket([])}>נקה סל</button>
                <button className="btn btn-primary" style={{ flex: 1, opacity: best ? 1 : 0.45 }} disabled={!best} onClick={addAll}>
                  הוסף לרשימה לפי {best ? best.label : 'הסניף הזול'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  ), document.body)
}

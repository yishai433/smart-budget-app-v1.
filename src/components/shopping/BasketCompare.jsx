import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Search, Plus, Minus, ChevronDown, Trophy } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import useScrollLock from '../../hooks/useScrollLock'
import { formatAmount } from '../../utils/format'
import { askPriceServer } from '../../utils/priceApi'

const money = (n, cur) => <span dir="ltr" className="num">{formatAmount(n, cur)}</span>

const ResultRow = memo(function ResultRow({ p, cur, onAdd }) {
  const n = Object.keys(p.prices).length
  return (
    <button onClick={() => onAdd(p)} className="list-item"
      style={{ width: '100%', border: 'none', textAlign: 'start', fontFamily: 'inherit' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
        <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{n > 1 ? `נמצא ב-${n} סניפים` : 'סניף אחד'}{p.unit ? ` · ${p.unit}` : ''}</div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>החל מ-</div>
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
  const [basket, setBasket] = useState(() => { try { return JSON.parse(localStorage.getItem(storeKey)) || [] } catch { return [] } })
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)       // null = not searched yet
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState('')
  const [compare, setCompare] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [branches, setBranches] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [open, setOpen] = useState(null)              // expanded branch key
  const reqN = useRef(0)

  // follow the visible area so the keyboard never covers the list
  const [vv, setVv] = useState(() => ({ h: window.visualViewport?.height || window.innerHeight, top: window.visualViewport?.offsetTop || 0 }))
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const sync = () => setVv({ h: v.height, top: v.offsetTop })
    v.addEventListener('resize', sync); v.addEventListener('scroll', sync)
    return () => { v.removeEventListener('resize', sync); v.removeEventListener('scroll', sync) }
  }, [])

  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(basket)) } catch { /* private mode */ } }, [basket, storeKey])

  // search as you type (after a short pause)
  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) { setResults(null); setSearching(false); setErr(''); return }
    const n = ++reqN.current
    setSearching(true)
    const id = setTimeout(async () => {
      try {
        const d = await askPriceServer(activeHouseholdId, user?.uid, { type: 'search', q: t })
        if (n !== reqN.current) return
        setResults(d.products || []); setBranches(d.branches || 0); setPreparing(!!d.preparing); setErr('')
      } catch { if (n === reqN.current) { setErr('השרת הביתי לא ענה בזמן. בדוק שהוא פועל.'); setResults([]) } }
      finally { if (n === reqN.current) setSearching(false) }
    }, 450)
    return () => clearTimeout(id)
  }, [q, activeHouseholdId, user?.uid])

  // price the whole basket whenever it changes
  const sig = useMemo(() => basket.map(b => `${b.code}x${b.qty}`).join(','), [basket])
  useEffect(() => {
    if (!basket.length) { setCompare(null); return }
    let alive = true
    setComparing(true)
    const id = setTimeout(async () => {
      try {
        const d = await askPriceServer(activeHouseholdId, user?.uid, { type: 'basket', items: basket.map(b => ({ code: b.code, qty: b.qty })) })
        if (alive) { setCompare(d.compare || []); setPreparing(!!d.preparing); setErr('') }
      } catch { if (alive) setErr('השרת הביתי לא ענה בזמן. בדוק שהוא פועל.') }
      finally { if (alive) setComparing(false) }
    }, 500)
    return () => { alive = false; clearTimeout(id) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, activeHouseholdId, user?.uid])

  const add = (p) => {
    setBasket(b => b.some(x => x.code === p.code) ? b.map(x => x.code === p.code ? { ...x, qty: x.qty + 1 } : x) : [...b, { code: p.code, name: p.name, qty: 1 }])
    setQ(''); setResults(null)
    document.activeElement?.blur?.()
  }
  const setQty = (code, d) => setBasket(b => b.flatMap(x => x.code !== code ? [x] : (x.qty + d <= 0 ? [] : [{ ...x, qty: Math.min(99, x.qty + d) }])))
  const remove = (code) => setBasket(b => b.filter(x => x.code !== code))

  // complete baskets first (cheapest on top), then partial ones
  const ranked = useMemo(() => {
    if (!compare) return []
    return [...compare].sort((a, b) => (a.missing.length - b.missing.length) || (a.total - b.total))
  }, [compare])
  const complete = ranked.filter(r => r.missing.length === 0)
  const best = complete[0]
  const worst = complete.length > 1 ? complete[complete.length - 1] : null
  const nameOf = (code) => basket.find(b => b.code === code)?.name || code

  const addAll = () => {
    if (!best) return
    onAddToList(basket.map(b => ({ name: b.name, qty: b.qty, price: best.prices[b.code] || 0 })))
    onClose()
  }

  return createPortal((
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="sheet-viewport" style={{ top: vv.top, bottom: 'auto', height: vv.h }}>
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
              <input className="input-field" style={{ paddingInlineStart: 40 }} placeholder="הוסף מוצר, למשל חלב"
                name="basket-product" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                inputMode="search" enterKeyHint="search" data-form-type="other" data-lpignore="true"
                value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {err && <div style={{ fontSize: 13, color: 'var(--c-danger, #b3261e)' }}>{err}</div>}
            {preparing && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>מחירי חלק מהסניפים שבחרת עדיין נטענים בשרת. התוצאות יתעדכנו בעוד כדקה.</div>}

            {q.trim().length >= 2 ? (
              <>
                {searching && <div style={{ fontSize: 13, color: 'var(--c-text2)', padding: '8px 0' }}>מחפש…</div>}
                {!searching && results && !results.length && !err && (
                  <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>לא נמצא מוצר כזה בסניפים שבחרת. נסה מילה אחרת.</div>
                )}
                {results?.length > 0 && <div className="card-list">{results.map(p => <ResultRow key={p.code} p={p} cur={cur} onAdd={add} />)}</div>}
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
                      איפה זול יותר {comparing && <span style={{ fontWeight: 400 }}>· מחשב…</span>}
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
                    {!ranked.length && !comparing && !err && <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>אין עדיין מחירים בסניפים שבחרת.</div>}
                    <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>המחירים לפי קובץ הבוקר של כל סניף, בלי מבצעי מועדון. מחיר המדף בחנות הוא הקובע.</div>
                  </div>
                )}
              </>
            )}
          </div>

          {basket.length > 0 && q.trim().length < 2 && (
            <div className="sheet-footer" style={{ padding: '10px 20px calc(10px + var(--safe-bottom))' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setBasket([]); setCompare(null) }}>נקה סל</button>
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

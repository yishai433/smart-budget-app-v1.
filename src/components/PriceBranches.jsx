import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Check, Store } from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../contexts/AppContext'
import useScrollLock from '../hooks/useScrollLock'
import useKeyboardHeight from '../hooks/useVisibleViewport'
import InfoHeading from './InfoHeading'

const DEFAULTS = ['shufersal-190', 'sapir-21']
const CHAIN = { shufersal: 'שופרסל', sapir: 'ספיר', osherad: 'אושר עד', ramilevi: 'רמי לוי', yohananof: 'יוחננוף', tivtaam: 'טיב טעם', freshmarket: 'פרשמרקט', stopmarket: 'סטופ מרקט', keshet: 'קשת טעמים' }
// Shufersal's file gives the city as a national city code (not a name). Major cities:
const CITY_BY_CODE = {
  3000: 'ירושלים', 5000: 'תל אביב-יפו', 4000: 'חיפה', 70: 'אשדוד', 7100: 'אשקלון', 9000: 'באר שבע', 6100: 'בני ברק',
  6600: 'חולון', 6200: 'בת ים', 8600: 'רמת גן', 6400: 'הרצליה', 6900: 'כפר סבא', 8700: 'רעננה', 7900: 'פתח תקווה',
  8300: 'ראשון לציון', 8400: 'רחובות', 7400: 'נתניה', 6500: 'חדרה', 1200: 'מודיעין-מכבים-רעות', 7000: 'לוד', 8500: 'רמלה',
  2610: 'בית שמש', 2630: 'קרית גת', 1139: 'כרמיאל', 9700: 'הוד השרון', 2620: 'קרית אונו', 2660: 'יבנה', 7600: 'עכו',
  9100: 'נהריה', 6700: 'טבריה', 7700: 'עפולה', 2500: 'נס ציונה', 2600: 'אילת', 2640: 'ראש העין', 2200: 'דימונה',
  2800: 'קרית שמונה', 8000: 'צפת', 7800: 'פרדס חנה-כרכור', 2530: 'באר יעקב', 1304: 'שוהם',
}
const cityName = (c) => /^\d+$/.test(c || '') ? (CITY_BY_CODE[Number(c)] || '') : (c || '')

// one row; memo so tapping a branch re-renders only that row
const Row = memo(function Row({ s, on, onToggle }) {
  return (
    <button onClick={() => onToggle(s.k)} className="list-item"
      style={{ width: '100%', border: 'none', textAlign: 'start', fontFamily: 'inherit', background: on ? 'var(--c-primary-light)' : undefined }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.n}</div>
        <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{CHAIN[s.c]}{cityName(s.city) ? ` · ${cityName(s.city)}` : ''}{s.a ? ` · ${s.a}` : ''}</div>
      </div>
      {on && <Check size={18} color="var(--c-primary)" strokeWidth={2.5} />}
    </button>
  )
})

function Picker({ catalog, selected, onSave, onClose }) {
  useScrollLock()
  const [q, setQ] = useState('')
  const kb = useKeyboardHeight()
  const dq = useDeferredValue(q)                       // typing stays instant, the list catches up
  const [sel, setSel] = useState(() => new Set(selected))
  const initial = useRef(new Set(selected))            // order is fixed when the sheet opens, so rows don't jump on tap
  // searchable text built once, not on every keystroke
  const index = useMemo(() => catalog.map(s => ({ s, text: `${s.n} ${cityName(s.city)} ${s.a}` })), [catalog])
  const shownAll = useMemo(() => {
    const t = dq.trim()
    const list = (t ? index.filter(x => x.text.includes(t)) : index).map(x => x.s)
    return list.sort((a, b) => (initial.current.has(b.k) - initial.current.has(a.k)) || cityName(a.city).localeCompare(cityName(b.city)))
  }, [dq, index])
  const total = shownAll.length
  const shown = useMemo(() => shownAll.slice(0, 120), [shownAll])
  const toggle = useCallback((k) => setSel(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n }), [])
  return createPortal((
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      {/* stop the sheet at the top of the keyboard so the list stays visible while typing */}
      <div className="sheet-viewport">
        <motion.div className="sheet" style={{ height: 'calc(100% - var(--safe-top) - 28px)' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">הסניפים שלי</h2>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label="סגירה"><X size={17} strokeWidth={2} /></button>
          </div>
          {/* search stays pinned; only the list below scrolls */}
          <div style={{ padding: '0 20px 10px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', insetInlineStart: 14, top: 15, color: 'var(--c-text2)' }} />
              <input className="input-field" style={{ paddingInlineStart: 40 }} placeholder="חיפוש סניף"
                name="branch-filter" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                inputMode="search" enterKeyHint="search" data-form-type="other" data-lpignore="true" data-no-refocus="1"
                value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 8 }}>
              {total} סניפים{total > shown.length ? ` · מוצגים ${shown.length} הראשונים, חפש עיר כדי לצמצם` : ''}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: `0 20px ${kb + 90}px` }}>
            <div className="card-list">
              {shown.map(s => <Row key={s.k} s={s} on={sel.has(s.k)} onToggle={toggle} />)}
              {!shown.length && <div style={{ padding: 16, fontSize: 13, color: 'var(--c-text2)' }}>לא נמצאו סניפים. נסה שם עיר אחר.</div>}
            </div>
          </div>
          <div className="sheet-footer" style={{ padding: `10px 20px ${kb ? 10 : 'calc(10px + var(--safe-bottom))'}`, transform: `translateY(${-kb}px)`, position: 'relative', zIndex: 2 }}>
            <button className="btn btn-primary btn-full" disabled={!sel.size} style={{ opacity: sel.size ? 1 : 0.45 }}
              onClick={() => onSave([...sel])}>שמירה ({sel.size})</button>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

// Settings card: which supermarket branches the barcode scanner compares.
function StatusLine({ status, onCheck }) {
  let text = 'בודק את השרת…', color = 'var(--c-text2)'
  if (status?.error) { text = 'לא הצלחתי לבדוק את מצב השרת.'; color = 'var(--c-danger, #b3261e)' }
  else if (status?.none) { text = 'השרת עוד לא טען מחירים לסניפים שלך.'; color = 'var(--c-remaining)' }
  else if (status?.at) {
    const d = new Date(status.at), now = new Date()
    const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
    const hm = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    const when = days === 0 ? `היום ב-${hm}` : days === 1 ? `אתמול ב-${hm}` : `לפני ${days} ימים (${d.toLocaleDateString('he-IL')})`
    const fresh = days === 0 || (days === 1 && now.getHours() < 8)   // the daily refresh runs after 06:00
    text = `${fresh ? 'השרת עובד. ' : 'המחירים לא התעדכנו היום. '}עודכן ${when} · ${status.n.toLocaleString('he-IL')} מוצרים, ${status.branches} סניפים`
    color = fresh ? 'var(--c-success)' : 'var(--c-remaining)'
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color }}>
      <span style={{ flex: 1 }}>{text}</span>
      <button onClick={onCheck} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12, minHeight: 0 }}>בדוק שוב</button>
    </div>
  )
}

export default function PriceBranches() {
  const { household, activeHouseholdId } = useApp()
  const [catalog, setCatalog] = useState(null)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const selected = (household?.priceStores?.length ? household.priceStores : DEFAULTS)

  // When the home server last loaded fresh prices (the product index is rewritten each time new files arrive)
  const [status, setStatus] = useState(null)      // null = loading, {at, n} or {none:true}
  const checkStatus = useCallback(() => {
    if (!activeHouseholdId) return
    setStatus(null)
    getDoc(doc(db, 'priceIndex', activeHouseholdId))
      .then(s => { const d = s.data(); setStatus(d?.updatedAt?.toMillis ? { at: d.updatedAt.toMillis(), n: d.n || 0, branches: d.keys?.length || 0 } : { none: true }) })
      .catch(() => setStatus({ error: true }))
  }, [activeHouseholdId])
  useEffect(() => { checkStatus() }, [checkStatus])

  useEffect(() => {
    getDoc(doc(db, 'priceCatalog', 'stores')).then(s => setCatalog(s.exists() ? s.data().stores || [] : [])).catch(() => setCatalog([]))
  }, [])

  const nameOf = (k) => catalog?.find(s => s.k === k)?.n || (k === 'shufersal-190' ? 'שופרסל דיל חצור הגלילית' : k === 'sapir-21' ? 'סופר ספיר חצור' : k)

  const save = async (keys) => {
    try {
      await setDoc(doc(db, 'households', activeHouseholdId), { priceStores: keys }, { merge: true })
      setMsg('נשמר. מחירי סניף חדש נטענים בשרת, זה לוקח כדקה.')
      setOpen(false)
    } catch { setMsg('השמירה נכשלה.') }
  }

  return (
    <>
      <InfoHeading tip="הסריקה ברשימת הקניות משווה מחירים בסניפים שתבחר כאן. המחירים נלקחים מקבצי המחירים הציבוריים של הרשתות ומתעדכנים פעם ביום.">
        סניפים להשוואת מחירים
      </InfoHeading>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selected.map(k => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <Store size={16} color="var(--c-primary)" /> {nameOf(k)}
            </div>
          ))}
          <StatusLine status={status} onCheck={checkStatus} />
          {msg && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{msg}</div>}
          <button className="btn btn-secondary btn-full" disabled={catalog === null || !catalog.length} onClick={() => setOpen(true)}>
            {catalog === null ? 'טוען…' : catalog.length ? 'בחירת סניפים לפי עיר' : 'רשימת הסניפים עדיין לא מוכנה בשרת'}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && catalog && <Picker catalog={catalog} selected={selected} onSave={save} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

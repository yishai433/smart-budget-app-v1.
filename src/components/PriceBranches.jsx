import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Check, Store } from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../contexts/AppContext'
import useScrollLock from '../hooks/useScrollLock'
import InfoHeading from './InfoHeading'

const DEFAULTS = ['shufersal-190', 'sapir-21']
const CHAIN = { shufersal: 'שופרסל', sapir: 'ספיר' }

// one row; memo so tapping a branch re-renders only that row
const Row = memo(function Row({ s, on, onToggle }) {
  return (
    <button onClick={() => onToggle(s.k)} className="list-item"
      style={{ width: '100%', border: 'none', textAlign: 'start', fontFamily: 'inherit', background: on ? 'var(--c-primary-light)' : undefined }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.n}</div>
        <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{CHAIN[s.c]}{s.city ? ` · ${s.city}` : ''}{s.a ? ` · ${s.a}` : ''}</div>
      </div>
      {on && <Check size={18} color="var(--c-primary)" strokeWidth={2.5} />}
    </button>
  )
})

function Picker({ catalog, selected, onSave, onClose }) {
  useScrollLock()
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)                       // typing stays instant, the list catches up
  const [sel, setSel] = useState(() => new Set(selected))
  const initial = useRef(new Set(selected))            // order is fixed when the sheet opens, so rows don't jump on tap
  // searchable text built once, not on every keystroke
  const index = useMemo(() => catalog.map(s => ({ s, text: `${s.n} ${s.city} ${s.a}` })), [catalog])
  const shown = useMemo(() => {
    const t = dq.trim()
    const list = (t ? index.filter(x => x.text.includes(t)) : index).map(x => x.s)
    return list.sort((a, b) => (initial.current.has(b.k) - initial.current.has(a.k)) || (a.city || '').localeCompare(b.city || '')).slice(0, 40)
  }, [dq, index])
  const toggle = useCallback((k) => setSel(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n }), [])
  return createPortal((
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="sheet-viewport">
        <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">הסניפים שלי</h2>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label="סגירה"><X size={17} strokeWidth={2} /></button>
          </div>
          <div className="sheet-body" style={{ gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', insetInlineStart: 14, top: 15, color: 'var(--c-text2)' }} />
              <input className="input-field" style={{ paddingInlineStart: 40 }} placeholder="חפש לפי עיר או שם סניף" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="card-list">
              {shown.map(s => <Row key={s.k} s={s} on={sel.has(s.k)} onToggle={toggle} />)}
              {!shown.length && <div style={{ padding: 16, fontSize: 13, color: 'var(--c-text2)' }}>לא נמצאו סניפים. נסה שם עיר אחר.</div>}
            </div>
            {catalog.length > 40 && !q && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>מוצגים 40 סניפים. הקלד עיר כדי לצמצם.</div>}
          </div>
          <div className="sheet-footer">
            <button className="btn btn-primary btn-full" disabled={!sel.size} style={{ opacity: sel.size ? 1 : 0.45 }}
              onClick={() => onSave([...sel])}>שמירה ({sel.size})</button>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

// Settings card: which supermarket branches the barcode scanner compares.
export default function PriceBranches() {
  const { household, activeHouseholdId } = useApp()
  const [catalog, setCatalog] = useState(null)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const selected = (household?.priceStores?.length ? household.priceStores : DEFAULTS)

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

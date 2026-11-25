import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Plus, Search } from 'lucide-react'
import { collection, addDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useApp } from '../../contexts/AppContext'
import useScrollLock from '../../hooks/useScrollLock'
import { formatAmount } from '../../utils/format'

const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/+esm'
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

// The camera is requested once and kept for a few minutes after the scanner closes, so reopening it
// doesn't trigger the iOS permission prompt again. Each use gets a clone, so stopping a scan never kills it.
let shared = null          // { stream, timer }
const KEEP_MS = 3 * 60 * 1000
async function acquireCamera() {
  if (shared) {
    clearTimeout(shared.timer)
    const t = shared.stream.getVideoTracks()[0]
    if (t && t.readyState === 'live') return shared.stream.clone()
    shared = null
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  shared = { stream, timer: 0 }
  return stream.clone()
}
function releaseCamera() {
  if (!shared) return
  clearTimeout(shared.timer)
  const mine = shared
  shared.timer = setTimeout(() => { mine.stream.getTracks().forEach(t => t.stop()); if (shared === mine) shared = null }, KEEP_MS)
}

function promoText(p, cur) {
  const price = p.price ? `${p.minQty > 1 ? `${p.minQty} ב-` : 'ב-'}${formatAmount(p.price, cur)}` : p.rate ? `${p.rate}% הנחה` : ''
  return `${p.text || 'מבצע'}${price && !(p.text || '').includes(String(p.price)) ? ` · ${price}` : ''}${p.club ? ' · למועדון' : ''}`
}

// Camera barcode scanner + price lookup from the home server. Falls back to typing the number.
export default function BarcodeSheet({ onClose }) {
  useScrollLock()
  const { activeHouseholdId, user, settings, shoppingItems, addShoppingItem, updateShoppingItem } = useApp()
  const cur = settings.currency
  const videoRef = useRef(null)
  const stopRef = useRef(() => {})
  const [stage, setStage] = useState('scan')      // scan | looking | result | notfound | error
  const [cameraMsg, setCameraMsg] = useState('')
  const [typed, setTyped] = useState('')
  const [barcode, setBarcode] = useState('')
  const [results, setResults] = useState([])
  const [pick, setPick] = useState(0)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('1')
  const [stale, setStale] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const busy = useRef(false)

  // ── camera ──
  useEffect(() => {
    if (stage !== 'scan') return
    let stopped = false
    const handle = (code) => { if (!stopped && !busy.current) { busy.current = true; lookup(code) } }
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera')
        if ('BarcodeDetector' in window) {
          const det = new window.BarcodeDetector({ formats: FORMATS })
          const stream = await acquireCamera()
          if (stopped) { stream.getTracks().forEach(t => t.stop()); releaseCamera(); return }
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
          stopRef.current = () => stream.getTracks().forEach(t => t.stop())
          const loop = async () => {
            if (stopped) return
            try { const f = await det.detect(videoRef.current); if (f[0]?.rawValue) return handle(f[0].rawValue) } catch { /* next frame */ }
            setTimeout(loop, 250)
          }
          loop()
        } else {
          // Safari/iPhone has no BarcodeDetector: load a decoder library on demand
          const { BrowserMultiFormatReader } = await import(/* @vite-ignore */ ZXING)
          const reader = new BrowserMultiFormatReader()
          const stream = await acquireCamera()
          if (stopped) { stream.getTracks().forEach(t => t.stop()); releaseCamera(); return }
          stopRef.current = () => { try { reader.reset() } catch { /* ignore */ } stream.getTracks().forEach(t => t.stop()) }
          await reader.decodeFromStream(stream, videoRef.current, (res) => { if (res) handle(res.getText()) })
        }
      } catch (e) {
        setCameraMsg(e?.name === 'NotAllowedError' ? 'אין הרשאה למצלמה. אפשר להקליד את הברקוד.' : 'לא הצלחנו לפתוח את המצלמה. אפשר להקליד את הברקוד.')
      }
    })()
    return () => { stopped = true; try { stopRef.current() } catch { /* ignore */ } releaseCamera() }
  }, [stage])

  // ── ask the home server ──
  const lookup = async (code) => {
    const clean = String(code).replace(/\D/g, '')
    if (clean.length < 6) { busy.current = false; return }
    try { stopRef.current() } catch { /* ignore */ }
    releaseCamera()
    setBarcode(clean); setStage('looking')
    try {
      const ref = await addDoc(collection(db, 'priceLookups'), {
        householdId: activeHouseholdId, barcode: clean, requestedBy: user?.uid || '', status: 'pending', createdAt: serverTimestamp(),
      })
      let finished = false
      const timer = setTimeout(() => { if (!finished) { finished = true; unsub(); setStage('error') } }, 15000)
      const unsub = onSnapshot(ref, (snap) => {
        const d = snap.data()
        if (!d || finished || d.status === 'pending') return
        finished = true; clearTimeout(timer); unsub()
        deleteDoc(ref).catch(() => {})
        if (d.status === 'done' && d.results?.length) {
          const sorted = [...d.results].sort((a, b) => a.price - b.price)
          setResults(sorted); setPick(0); setName(sorted[0].name); setPrice(String(sorted[0].price)); setStale(!!d.stale); setStage('result')
        } else if (d.status === 'done') { setPreparing(!!d.preparing); setStage('notfound') } else { setStage('error') }
      })
    } catch { setStage('error') }
  }

  const again = () => { busy.current = false; setResults([]); setName(''); setPrice(''); setQty('1'); setTyped(''); setStage('scan') }

  const add = async () => {
    const q = Math.max(1, parseFloat(qty) || 1), p = Math.max(0, parseFloat(price) || 0)
    if (!name.trim()) return
    const existing = shoppingItems.find(i => i.barcode === barcode || i.name.trim() === name.trim())
    if (existing) await updateShoppingItem(existing.id, { estimatedPrice: p, quantity: q, checked: true, barcode })
    else await addShoppingItem({ name: name.trim(), quantity: q, estimatedPrice: p, category: 'other', otherLabel: '', barcode, checked: true })
    window.dispatchEvent(new CustomEvent('sb-toast', { detail: `${name.trim()} נוסף לסל` }))
    again()
  }

  const chosen = results[pick]
  return createPortal((
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="sheet-viewport">
        <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">סריקת מוצר</h2>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label="סגירה"><X size={17} strokeWidth={2} /></button>
          </div>

          <div className="sheet-body" style={{ gap: 14 }}>
            {stage === 'scan' && (
              <>
                <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#000', aspectRatio: '4 / 3' }}>
                  <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', left: '12%', right: '12%', top: '38%', bottom: '38%', border: '2px solid rgba(255,255,255,.85)', borderRadius: 12 }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--c-text2)', textAlign: 'center' }}>{cameraMsg || 'כוון את המצלמה אל הברקוד'}</div>
                <form onSubmit={e => { e.preventDefault(); busy.current = true; lookup(typed) }} style={{ display: 'flex', gap: 8 }}>
                  <input className="input-field" style={{ flex: 1, height: 46 }} inputMode="numeric" placeholder="או הקלד את מספר הברקוד"
                    value={typed} onChange={e => setTyped(e.target.value.replace(/\D/g, ''))} />
                  <button type="submit" className="btn btn-secondary" aria-label="חיפוש"><Search size={16} /></button>
                </form>
              </>
            )}

            {stage === 'looking' && <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--c-text2)' }}>מחפש מחיר לברקוד {barcode}…</div>}

            {stage === 'result' && chosen && (
              <>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{name}</div>
                  <div className="num" style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>ברקוד {barcode}{chosen.unit ? ` · ${chosen.unit}` : ''}</div>
                </div>
                <div className="card-list">
                  {results.map((r, i) => (
                    <button key={r.key} onClick={() => { setPick(i); setName(r.name); setPrice(String(r.price)) }} className="list-item"
                      style={{ width: '100%', border: 'none', textAlign: 'start', background: i === pick ? 'var(--c-primary-light)' : undefined, fontFamily: 'inherit' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                        {r.promos?.map((p, j) => (
                          <div key={j} style={{ fontSize: 12, color: 'var(--c-remaining)', marginTop: 2 }}>{promoText(p, cur)}</div>
                        ))}
                      </div>
                      <span dir="ltr" className="num" style={{ fontSize: 16, fontWeight: 700 }}>{formatAmount(r.price, cur)}</span>
                    </button>
                  ))}
                </div>
                {stale && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>המחירים לא עודכנו היום, ייתכן שהם לא מדויקים.</div>}
                <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>המחיר לפי קובץ המחירים של הבוקר. מחיר המדף בחנות הוא המחיר הקובע.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">מחיר ({cur})</label>
                    <input className="input-field" type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} style={{ textAlign: 'center', fontWeight: 700 }} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">כמות</label>
                    <input className="input-field" type="number" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} style={{ textAlign: 'center', fontWeight: 700 }} />
                  </div>
                </div>
              </>
            )}

            {(stage === 'notfound' || stage === 'error') && (
              <>
                <div style={{ fontSize: 14, color: 'var(--c-text2)', lineHeight: 1.5 }}>
                  {stage === 'notfound' && preparing
                    ? 'מחירי הסניפים החדשים שבחרת עדיין נטענים בשרת (בערך דקה). נסה שוב עוד רגע, או הוסף את המוצר ידנית.'
                    : stage === 'notfound'
                    ? `הברקוד ${barcode} לא נמצא בקבצי המחירים של הסניפים שלך. אפשר להוסיף את המוצר ידנית.`
                    : 'השרת הביתי לא ענה בזמן. בדוק שהוא פועל ושיש אינטרנט. אפשר להוסיף את המוצר ידנית.'}
                </div>
                <input className="input-field" placeholder="שם המוצר" value={name} onChange={e => setName(e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="input-field" type="number" inputMode="decimal" placeholder={`מחיר (${cur})`} value={price} onChange={e => setPrice(e.target.value)} style={{ textAlign: 'center' }} />
                  <input className="input-field" type="number" inputMode="numeric" placeholder="כמות" value={qty} onChange={e => setQty(e.target.value)} style={{ textAlign: 'center' }} />
                </div>
              </>
            )}
          </div>

          {stage !== 'scan' && stage !== 'looking' && (
            <div className="sheet-footer">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary btn-full" onClick={add} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.45 }}>
                  <Plus size={16} strokeWidth={2.2} /> הוסף לסל
                </button>
                <button className="btn btn-secondary btn-full" onClick={again}>סרוק מוצר נוסף</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  ), document.body)
}

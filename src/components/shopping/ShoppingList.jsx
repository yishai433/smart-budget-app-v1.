import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import useScrollLock from '../../hooks/useScrollLock'
import useDelayedFocus from '../../hooks/useDelayedFocus'
import { X, Check, Plus, ScanLine } from 'lucide-react'
import BarcodeSheet from './BarcodeSheet'
import { formatAmount } from '../../utils/format'

export const SHOP_CATS = ['produce','dairy','meat','bakery','frozen','drinks','cleaning','personal','other']
export const CAT_COLORS = {
  produce: '#7E9A5C', dairy: '#4F7A8A', meat: '#C0524F', bakery: '#D08A2E',
  frozen: '#3F6F73', drinks: '#6B5FA0', cleaning: '#56633F', personal: '#D98FA0', other: '#8A8272',
}

function SheetWrap({ onClose, children }) {
  useScrollLock()
  // Portal to <body> — ShoppingPage is a routed page inside AnimatedRoutes'
  // will-change:transform wrapper, which becomes the containing block for
  // position:fixed children and misplaces the sheet relative to full page
  // height instead of the viewport.
  return createPortal((
    <>
      <motion.div className="sheet-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="sheet-viewport">
        <motion.div className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </>
  ), document.body)
}

function EditItemSheet({ item, cur, onSave, onClose }) {
  const priceRef = useDelayedFocus()
  const [qty, setQty] = useState(String(item.quantity || ''))
  const [price, setPrice] = useState(String(item.estimatedPrice || ''))

  const canSave = parseFloat(qty) > 0 && parseFloat(price) > 0

  const handleSave = async () => {
    if (!canSave) return
    await onSave(item.id, { quantity: parseFloat(qty), estimatedPrice: parseFloat(price) })
    onClose()
  }

  return (
    <SheetWrap onClose={onClose}>
      <div className="sheet-handle" />
      <div className="sheet-header">
        <div>
          <h2 className="sheet-title" style={{ fontSize: 16 }}>{item.name}</h2>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>עריכת כמות ומחיר</div>
        </div>
        <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="sheet-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">מחיר ({cur}) *</label>
            <input ref={priceRef} className="input-field" type="number" inputMode="decimal" placeholder="0.00"
              value={price} onChange={e => setPrice(e.target.value)}
              style={{ textAlign: 'center', fontWeight: 700, fontSize: 20 }} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">כמות *</label>
            <input className="input-field" type="number" inputMode="decimal" placeholder="0"
              value={qty} onChange={e => setQty(e.target.value)}
              style={{ textAlign: 'center', fontWeight: 700, fontSize: 20 }} />
          </div>
        </div>
        {canSave && (
          <div style={{ textAlign: 'center', color: 'var(--c-text2)', fontSize: 13 }}>
            סה״כ: <span dir="ltr" style={{ fontWeight: 700, color: 'var(--c-text)' }}>
              {formatAmount(parseFloat(price) * parseFloat(qty), cur)}
            </span>
          </div>
        )}
      </div>

      <div className="sheet-footer">
        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.45, fontSize: 16, fontWeight: 700 }}>
          שמור
        </button>
      </div>
    </SheetWrap>
  )
}

export default function ShoppingList({ onCheckout }) {
  const { shoppingItems, updateShoppingItem, deleteShoppingItem, addShoppingItem, settings } = useApp()
  const [editing, setEditing] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const cur = settings.currency

  const lineTotal = (i) => (i.estimatedPrice || 0) * (i.quantity || 1)
  const toBuy = shoppingItems.filter(i => !i.checked)
  const basket = shoppingItems.filter(i => i.checked)
  const basketTotal = basket.reduce((s, i) => s + lineTotal(i), 0)

  const handleAdd = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    await addShoppingItem({
      name: n, quantity: 1, estimatedPrice: Math.max(0, parseFloat(price) || 0),
      category: 'other', otherLabel: '', checked: false,   // typed in = still to buy
    })
    setName(''); setPrice('')
  }

  const priceLabel = (i) => lineTotal(i) > 0 ? formatAmount(lineTotal(i), cur) : '—'

  return (
    <>
      <form onSubmit={handleAdd} style={{ margin: '0 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input-field" style={{ flex: 1, minWidth: 0, height: 50 }}
          placeholder="מה צריך לקנות?" aria-label="פריט חדש"
          value={name} onChange={e => setName(e.target.value)}
        />
        <input
          className="input-field" style={{ width: 70, height: 50, padding: '0 12px', textAlign: 'center' }}
          type="number" inputMode="decimal" placeholder={cur} aria-label="מחיר משוער"
          value={price} onChange={e => setPrice(e.target.value)}
        />
        <button type="button" onClick={() => setScanning(true)} aria-label="סריקת ברקוד" style={{
          width: 50, height: 50, borderRadius: '50%', border: '1px solid var(--c-border)', flexShrink: 0,
          background: 'var(--c-card)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ScanLine size={22} strokeWidth={2.2} />
        </button>
        <button type="submit" aria-label="הוספה לרשימה" style={{
          width: 50, height: 50, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Plus size={22} strokeWidth={2.4} />
        </button>
      </form>

      <div style={{ padding: '20px 20px 8px', fontSize: 13, fontWeight: 700, color: 'var(--c-text2)' }}>
        לקנות ({toBuy.length})
      </div>
      {toBuy.length > 0 ? (
        <div className="card-list" style={{ margin: '0 16px' }}>
          <AnimatePresence initial={false}>
            {toBuy.map(item => (
              <motion.div key={item.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="list-item" style={{ gap: 14, padding: '12px 16px' }}>
                  <button
                    onClick={() => updateShoppingItem(item.id, { checked: true })}
                    aria-label={`סימון ${item.name} כנקנה`}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--c-primary)', background: 'transparent', padding: 0, flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(item)}>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>{item.name}</div>
                    {item.quantity > 1 && (
                      <div className="num" style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>×{item.quantity}</div>
                    )}
                  </div>
                  <span dir="ltr" className="num" style={{ fontSize: 15, fontWeight: 600 }}>{priceLabel(item)}</span>
                  <button
                    onClick={() => deleteShoppingItem(item.id)} aria-label={`מחיקת ${item.name}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 4, display: 'flex' }}
                  >
                    <X size={17} strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div style={{ margin: '0 16px', padding: 18, borderRadius: 24, background: 'var(--c-card)', textAlign: 'center', fontSize: 14, color: 'var(--c-text2)' }}>
          אין מה לקנות כרגע. אפשר להוסיף פריט למעלה.
        </div>
      )}

      {basket.length > 0 && (
        <>
          <div style={{ padding: '20px 20px 8px', fontSize: 13, fontWeight: 700, color: 'var(--c-text2)' }}>
            כבר בסל ({basket.length})
          </div>
          <div style={{ margin: '0 16px', border: '1px dashed var(--c-border)', borderRadius: 24, overflow: 'hidden' }}>
            {basket.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px' }}>
                <button
                  onClick={() => updateShoppingItem(item.id, { checked: false })}
                  aria-label={`החזרת ${item.name} לרשימה`}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--c-accent2-mid)', background: 'var(--c-accent2-mid)', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Check size={14} strokeWidth={3} color="#221f0f" />
                </button>
                <div style={{ flex: 1, fontSize: 15, color: 'var(--c-text2)', textDecoration: 'line-through' }}>{item.name}</div>
                <span dir="ltr" className="num" style={{ fontSize: 14, color: 'var(--c-text2)' }}>{priceLabel(item)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{
        position: 'sticky', bottom: 'calc(var(--nav-h) + var(--safe-bottom) + 8px)',
        padding: '16px 16px 8px', marginTop: 8,
        background: 'linear-gradient(to top, var(--c-bg) 70%, transparent)',
      }}>
        {basket.length > 0 ? (
          <motion.button
            className="btn btn-primary btn-full" whileTap={{ scale: 0.98 }}
            style={{ height: 54, borderRadius: 27, fontSize: 16 }}
            onClick={() => onCheckout(basketTotal)}
          >
            סיימתי קנייה · <span dir="ltr">{formatAmount(basketTotal, cur)}</span>
          </motion.button>
        ) : (
          <div style={{ height: 54, borderRadius: 27, background: 'var(--c-card)', color: 'var(--c-text2)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            סמנו פריטים שנכנסו לסל
          </div>
        )}
      </div>

      <AnimatePresence>
        {scanning && <BarcodeSheet onClose={() => setScanning(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {editing && (
          <EditItemSheet item={editing} cur={cur} onSave={updateShoppingItem} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

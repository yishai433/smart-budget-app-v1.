import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import CategoryIcon from '../CategoryIcon'
import useScrollLock from '../../hooks/useScrollLock'
import useDelayedFocus from '../../hooks/useDelayedFocus'
import { X, Pencil, Check, Plus, ShoppingCart } from 'lucide-react'
import { formatAmount, formatNumber } from '../../utils/format'

export const SHOP_CATS = ['produce','dairy','meat','bakery','frozen','drinks','cleaning','personal','other']
export const CAT_COLORS = {
  produce: '#34C759', dairy: '#5AC8FA', meat: '#FF6B6B', bakery: '#FF9F0A',
  frozen: '#32ADE6', drinks: '#0A84FF', cleaning: '#30D158', personal: '#BF5AF2', other: '#636366',
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
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          {children}
        </motion.div>
      </div>
    </>
  ), document.body)
}

function AddItemSheet({ onClose }) {
  const { t } = useTranslation()
  const { addShoppingItem } = useApp()
  const nameRef = useDelayedFocus()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [cat, setCat] = useState('other')
  const [otherLabel, setOtherLabel] = useState('')

  const canAdd = name.trim() && parseFloat(qty) > 0 && parseFloat(price) > 0

  const handleAdd = async () => {
    if (!canAdd) return
    await addShoppingItem({
      name: name.trim(),
      quantity: parseFloat(qty),
      estimatedPrice: parseFloat(price),
      category: cat,
      otherLabel: cat === 'other' ? otherLabel.trim() : '',
    })
    onClose()
  }

  return (
    <SheetWrap onClose={onClose}>
      <div className="sheet-handle" />
      <div className="sheet-header">
        <h2 className="sheet-title">{t('shopping.addItem')}</h2>
        <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="sheet-body" style={{ gap: 14 }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">{t('shopping.itemName')}</label>
          <input ref={nameRef} className="input-field" placeholder={t('shopping.itemName')}
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">מחיר (₪) *</label>
            <input className="input-field" type="number" inputMode="decimal" placeholder="0.00"
              value={price} onChange={e => setPrice(e.target.value)}
              style={{ textAlign: 'center', fontWeight: 700, fontSize: 17 }} />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">כמות *</label>
            <input className="input-field" type="number" inputMode="decimal" placeholder="0"
              value={qty} onChange={e => setQty(e.target.value)}
              style={{ textAlign: 'center', fontWeight: 700, fontSize: 17 }} />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">{t('transaction.category')}</label>
          <div className="cat-grid">
            {SHOP_CATS.map(c => (
              <button key={c} className={`cat-btn ${cat === c ? 'selected' : ''}`}
                onClick={() => { setCat(c); if (c !== 'other') setOtherLabel('') }}
                style={cat === c ? { borderColor: CAT_COLORS[c], background: CAT_COLORS[c] + '18' } : {}}>
                <div className="cat-icon" style={{ color: cat === c ? CAT_COLORS[c] : 'var(--c-text2)' }}>
                  <CategoryIcon id={c} size={26} />
                </div>
                <span className="cat-label">{t(`shopping.categories.${c}`)}</span>
              </button>
            ))}
          </div>
          <AnimatePresence>
            {cat === 'other' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 8, position: 'relative' }}>
                  <input className="input-field" placeholder="פירוט (אופציונלי)" value={otherLabel}
                    onChange={e => setOtherLabel(e.target.value)} style={{ paddingInlineEnd: 38 }} />
                  <span style={{ position: 'absolute', insetInlineEnd: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none', display: 'flex' }}>
                    <Pencil size={15} strokeWidth={2} />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="sheet-footer">
        <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={!canAdd}
          style={{ opacity: canAdd ? 1 : 0.45, transition: 'opacity 0.2s', fontSize: 15, fontWeight: 600 }}>
          <Plus size={16} strokeWidth={2.2} /> {t('common.add')}
        </button>
      </div>
    </SheetWrap>
  )
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
  const { t } = useTranslation()
  const { shoppingItems, updateShoppingItem, deleteShoppingItem, settings } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const cur = settings.currency

  const grouped = SHOP_CATS.reduce((acc, c) => {
    const items = shoppingItems.filter(i => i.category === c)
    if (items.length) acc[c] = items
    return acc
  }, {})

  const checkedCount = shoppingItems.filter(i => i.checked).length
  const total = shoppingItems
    .filter(i => i.checked)
    .reduce((s, i) => s + (i.estimatedPrice || 0) * (i.quantity || 1), 0)

  if (shoppingItems.length === 0) {
    return (
      <>
        <div className="empty-state">
          <div className="empty-icon"><ShoppingCart size={22} strokeWidth={1.8} /></div>
          <h3>{t('shopping.noItems')}</h3>
          <p>{t('shopping.noItemsHint')}</p>
        </div>
        <div style={{ padding: '0 16px' }}>
          <button className="btn btn-primary btn-full" onClick={() => setShowAdd(true)}>
            + {t('shopping.addItem')}
          </button>
        </div>
        <AnimatePresence>
          {showAdd && <AddItemSheet onClose={() => setShowAdd(false)} />}
        </AnimatePresence>
      </>
    )
  }

  return (
    <>
      {/* Summary — running total + progress */}
      <div style={{ padding: '4px 16px 18px' }}>
        <div className="hero-ink" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div className="t-overline" style={{ color: 'var(--c-ink-text2)' }}>
                {t('shopping.checkout')}
              </div>
              <div dir="ltr" className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, marginTop: 6, textAlign: 'start' }}>
                <span className="cur" style={{ fontSize: 18 }}>{cur}</span>{formatNumber(total)}
              </div>
            </div>
            <div className="num" style={{ fontSize: 12.5, color: 'var(--c-ink-text2)' }}>
              {checkedCount}/{shoppingItems.length} {t('shopping.myList')}
            </div>
          </div>
          <div style={{ marginTop: 14, height: 5, background: 'rgba(34,31,15,0.14)', borderRadius: 999, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: shoppingItems.length ? `${(checkedCount / shoppingItems.length) * 100}%` : '0%' }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              style={{ height: '100%', background: 'var(--c-ink-text)', borderRadius: 999 }}
            />
          </div>
        </div>
      </div>

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ padding: '0 20px 6px', fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: CAT_COLORS[cat] || 'var(--c-text2)' }}><CategoryIcon id={cat} size={15} /></span>
            {cat === 'other' && items[0]?.otherLabel ? items[0].otherLabel : t(`shopping.categories.${cat}`)}
          </div>
          <div className="card-list" style={{ margin: '0 16px' }}>
            <AnimatePresence initial={false}>
              {items.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="list-item" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0,
                      width: 4, background: CAT_COLORS[item.category] || '#636366',
                    }} />
                    <button
                      className={`check-btn ${item.checked ? 'checked' : ''}`}
                      onClick={() => updateShoppingItem(item.id, { checked: !item.checked })}
                    >
                      {item.checked && <Check size={13} strokeWidth={3} color="white" />}
                    </button>

                    {/* Tappable area → opens edit sheet */}
                    <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                      onClick={() => setEditing(item)}>
                      <span style={{
                        fontSize: 15, fontWeight: 500,
                        textDecoration: item.checked ? 'line-through' : 'none',
                        color: item.checked ? 'var(--c-text3)' : 'var(--c-text)',
                      }}>
                        {item.name}
                      </span>
                      <div className="num" style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                        {item.quantity > 1 ? `×${item.quantity}  ` : ''}
                        {item.estimatedPrice > 0
                          ? formatAmount(item.estimatedPrice * (item.quantity || 1), cur)
                          : <span style={{ color: 'var(--c-danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              הכנס מחיר <Pencil size={11} strokeWidth={2} />
                            </span>
                        }
                      </div>
                    </div>

                    <button
                      onClick={() => deleteShoppingItem(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 4, display: 'flex' }}
                      aria-label="delete item"
                    >
                      <X size={17} strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {/* Add item + Checkout */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-secondary btn-full" onClick={() => setShowAdd(true)}>
          <Plus size={16} strokeWidth={2.2} /> {t('shopping.addItem')}
        </button>
        {total > 0 && (
          <motion.button
            className="btn btn-primary btn-full"
            whileTap={{ scale: 0.98 }}
            onClick={() => onCheckout(total)}
          >
            {t('shopping.checkout')} · {formatAmount(total, cur)}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddItemSheet onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {editing && (
          <EditItemSheet
            item={editing}
            cur={cur}
            onSave={updateShoppingItem}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

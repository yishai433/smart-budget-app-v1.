import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import CategoryIcon from '../CategoryIcon'
import useScrollLock from '../../hooks/useScrollLock'
import useDelayedFocus from '../../hooks/useDelayedFocus'
import { X, Plus, ShoppingBag, ArrowLeftCircle, Trash2, ArrowLeft } from 'lucide-react'
import { CAT_COLORS } from './ShoppingList'

// A lightweight wishlist separate from the active shopping cart — type a
// product name, the category is guessed automatically. Items can be moved
// into the active cart one at a time or all at once, and a price can be set
// per category (e.g. "5 ₪ for everything in produce") applied to every item
// in that group when it moves.
export default function LaterListSheet({ onClose }) {
  useScrollLock()
  const { t } = useTranslation()
  const { laterItems, addLaterItem, deleteLaterItem, moveLaterItemToShopping } = useApp()
  const nameRef = useDelayedFocus()
  const [name, setName] = useState('')
  const [moving, setMoving] = useState(false)
  const [categoryPrices, setCategoryPrices] = useState({}) // { [category]: "5.00" }

  const handleAdd = async () => {
    if (!name.trim()) return
    await addLaterItem(name)
    setName('')
  }

  const priceFor = (category) => parseFloat(categoryPrices[category]) || 0

  const handleMoveOne = async (item) => {
    setMoving(true)
    await moveLaterItemToShopping(item, priceFor(item.category))
    setMoving(false)
  }

  const handleMoveAll = async () => {
    setMoving(true)
    for (const item of laterItems) {
      await moveLaterItemToShopping(item, priceFor(item.category))
    }
    setMoving(false)
  }

  // Group items by category, in a stable, predictable order.
  const groups = laterItems.reduce((acc, item) => {
    (acc[item.category] ||= []).push(item)
    return acc
  }, {})

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
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div>
              <h2 className="sheet-title" style={{ fontSize: 17 }}>רשימה מאוחרת</h2>
              <div style={{ fontSize: 12.5, color: 'var(--c-text2)', marginTop: 2 }}>
                דברים שנזכרתם בהם — להוסיף לעגלה כשמגיע הזמן
              </div>
            </div>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="sheet-body" style={{ gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={nameRef}
                className="input-field"
                placeholder="לדוגמה: נורות לד"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={!name.trim()}
                style={{ padding: '0 18px', flexShrink: 0, opacity: name.trim() ? 1 : 0.45 }}
                aria-label="add"
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
            </div>

            {laterItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-icon"><ShoppingBag size={22} strokeWidth={1.8} /></div>
                <p>{'הרשימה ריקה — תתחילו להוסיף פריטים לזכור'}</p>
              </div>
            ) : (
              <>
                {Object.entries(groups).map(([category, items]) => {
                  const color = CAT_COLORS[category] || '#636366'
                  return (
                    <div key={category}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 10, padding: '0 2px 6px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--c-text2)' }}>
                          <CategoryIcon id={category} size={14} strokeWidth={2} color={color} />
                          {t(`shopping.categories.${category}`)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--c-text3)' }}>מחיר לכולם:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={categoryPrices[category] || ''}
                            onChange={e => setCategoryPrices(p => ({ ...p, [category]: e.target.value.replace(/[^0-9.]/g, '') }))}
                            style={{
                              width: 46, height: 26, textAlign: 'center', fontSize: 12.5,
                              border: '1px solid var(--c-border)', borderRadius: 999,
                              background: 'var(--c-card)', color: 'var(--c-text)',
                              fontFamily: 'inherit', padding: 0,
                            }}
                          />
                        </div>
                      </div>

                      <div className="card-list" style={{ marginBottom: 14 }}>
                        <AnimatePresence initial={false}>
                          {items.map((item, i) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <div className="list-item" style={{
                                cursor: 'default',
                                borderBottom: i < items.length - 1 ? '1px solid var(--c-sep)' : 'none',
                              }}>
                                <div className="list-icon" style={{ background: color + '18', color }}>
                                  <CategoryIcon id={item.category} size={16} strokeWidth={2} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 500 }}>
                                  {item.name}
                                </div>
                                <button
                                  onClick={() => handleMoveOne(item)}
                                  disabled={moving}
                                  className="btn-icon"
                                  style={{ color: 'var(--c-accent2-dark)', background: 'var(--c-accent2-light)', border: 'none' }}
                                  aria-label="move to cart"
                                >
                                  <ArrowLeftCircle size={18} strokeWidth={2} />
                                </button>
                                <button
                                  onClick={() => deleteLaterItem(item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 4, display: 'flex' }}
                                  aria-label="delete"
                                >
                                  <Trash2 size={16} strokeWidth={2} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {laterItems.length > 0 && (
            <div className="sheet-footer">
              <button
                className="btn btn-primary btn-full"
                onClick={handleMoveAll}
                disabled={moving}
                style={{ opacity: moving ? 0.6 : 1 }}
              >
                {moving ? '⏳' : <>העבר הכל לעגלה <ArrowLeft size={16} strokeWidth={2.2} /></>}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  ), document.body)
}

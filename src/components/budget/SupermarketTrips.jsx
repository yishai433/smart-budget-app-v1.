import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, ChevronLeft, X } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import CategoryIcon from '../CategoryIcon'
import useScrollLock from '../../hooks/useScrollLock'
import { formatAmount } from '../../utils/format'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

function TripDetailSheet({ tx, cur, onClose }) {
  useScrollLock()
  const items = tx.items || []
  const total = items.length > 0
    ? items.reduce((s, i) => s + (i.estimatedPrice || 0) * (i.quantity || 1), 0)
    : tx.amount || 0

  // Portal to <body> — this page is a descendant of AnimatedRoutes' will-change
  // wrapper, which becomes the containing block for position:fixed children.
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
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div style={{ minWidth: 0 }}>
              <h2 className="sheet-title" style={{ fontSize: 16 }}>{tx.description}</h2>
              <div style={{ fontSize: 12.5, color: 'var(--c-text2)', marginTop: 2 }}>
                {formatDate(tx.date)}
              </div>
            </div>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32, flexShrink: 0 }}>
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="sheet-body">
            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 24px' }}>
                <div className="empty-icon"><ShoppingCart size={22} strokeWidth={1.8} /></div>
                <p>אין פירוט פריטים לקניה זו</p>
              </div>
            ) : (
              <div className="card-list">
                {items.map((item, i) => (
                  <div key={i} className="list-item" style={{
                    cursor: 'default',
                    borderBottom: i < items.length - 1 ? '1px solid var(--c-sep)' : 'none',
                  }}>
                    <div className="list-icon" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary)' }}>
                      <CategoryIcon id={item.category} size={16} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</div>
                      {item.quantity > 1 && (
                        <div className="num" style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                          ×{item.quantity}
                        </div>
                      )}
                    </div>
                    <div dir="ltr" className="num" style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>
                      {formatAmount((item.estimatedPrice || 0) * (item.quantity || 1), cur)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--c-text2)' }}>סה״כ</span>
              <div dir="ltr" className="num" style={{ fontWeight: 700, fontSize: 20, letterSpacing: -0.5, color: 'var(--c-danger)' }}>
                −{formatAmount(total, cur)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

export default function SupermarketTrips({ cur }) {
  const { transactions } = useApp()
  const [selected, setSelected] = useState(null)

  const trips = transactions
    .filter(tx => tx.isShoppingTrip)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4)

  if (trips.length === 0) return null

  return (
    <>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2, marginBottom: 8, padding: '0 4px' }}>
          קניות בסופר
        </div>
        <div className="card-list">
          {trips.map((tx, i) => (
            <motion.div
              key={tx.id}
              className="list-item"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelected(tx)}
              style={{
                cursor: 'pointer',
                borderBottom: i < trips.length - 1 ? '1px solid var(--c-sep)' : 'none',
              }}
            >
              <div className="list-icon" style={{ background: 'var(--c-primary-light)', color: 'var(--c-primary)' }}>
                <ShoppingCart size={17} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.description}
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                  {formatShort(tx.date)}
                  {tx.items?.length > 0 && ` · ${tx.items.length} פריטים`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div dir="ltr" className="num" style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--c-danger)' }}>
                  −{formatAmount(tx.amount || 0, cur)}
                </div>
                <ChevronLeft size={15} strokeWidth={2} style={{ color: 'var(--c-text3)' }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <TripDetailSheet tx={selected} cur={cur} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

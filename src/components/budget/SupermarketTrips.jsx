import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import CategoryIcon from '../CategoryIcon'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

function TripDetailSheet({ tx, cur, onClose }) {
  const items = tx.items || []
  const total = items.length > 0
    ? items.reduce((s, i) => s + (i.estimatedPrice || 0) * (i.quantity || 1), 0)
    : tx.amount || 0

  return (
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
              <h2 className="sheet-title">🏪 {tx.description}</h2>
              <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>
                {formatDate(tx.date)}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--c-bg)', border: 'none', borderRadius: 20,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--c-text2)',
            }}>✕</button>
          </div>

          <div className="sheet-body">
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--c-text2)', padding: '24px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                <div style={{ fontSize: 14 }}>אין פירוט פריטים לקניה זו</div>
              </div>
            ) : (
              <div className="card-list">
                {items.map((item, i) => (
                  <div key={i} className="list-item">
                    <div className="list-icon" style={{ background: 'var(--c-primary)18', color: 'var(--c-primary)' }}>
                      <CategoryIcon id={item.category} size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      {item.quantity > 1 && (
                        <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 1 }}>
                          ×{item.quantity}
                        </div>
                      )}
                    </div>
                    <div dir="ltr" style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>
                      {cur}{((item.estimatedPrice || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>סה״כ</span>
              <div dir="ltr" style={{ fontWeight: 800, fontSize: 22, color: 'var(--c-danger)' }}>
                {cur}−{total.toFixed(2)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
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
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
          קניות בסופר 🛒
        </h3>
        <div className="card-list">
          {trips.map((tx, i) => (
            <motion.div
              key={tx.id}
              className="list-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(tx)}
              style={{ cursor: 'pointer' }}
            >
              <div className="list-icon" style={{ background: 'var(--c-primary)20', color: 'var(--c-primary)' }}>
                <ShoppingCart size={20} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tx.description}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 1 }}>
                  {formatShort(tx.date)}
                  {tx.items?.length > 0 && ` · ${tx.items.length} פריטים`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div dir="ltr" style={{ fontWeight: 700, color: 'var(--c-danger)' }}>
                  {cur}−{(tx.amount || 0).toFixed(2)}
                </div>
                <span style={{ color: 'var(--c-text3)', fontSize: 16 }}>›</span>
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

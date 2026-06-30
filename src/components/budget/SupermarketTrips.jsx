import { useApp } from '../../contexts/AppContext'
import { ShoppingCart } from 'lucide-react'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

export default function SupermarketTrips() {
  const { transactions, settings } = useApp()
  const cur = settings.currency

  const trips = transactions
    .filter(tx => tx.isShoppingTrip)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4)

  if (trips.length === 0) return null

  return (
    <div style={{ padding: '0 16px 4px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 10, color: 'var(--c-text2)', fontSize: 13, fontWeight: 600,
      }}>
        <ShoppingCart size={14} strokeWidth={2} />
        קניות בסופר
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {trips.map((tx, i) => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 16px',
            borderBottom: i < trips.length - 1 ? '1px solid var(--c-sep)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--c-primary)18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingCart size={16} color="var(--c-primary)" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tx.description}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 1 }}>
                  {formatDate(tx.date)}
                </div>
              </div>
            </div>
            <div dir="ltr" style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-danger)' }}>
              {cur}−{(tx.amount || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

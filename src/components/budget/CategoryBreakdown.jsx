import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { motion } from 'framer-motion'
import { formatAmount } from '../../utils/format'
import CategoryIcon from '../CategoryIcon'

export default function CategoryBreakdown() {
  const { t } = useTranslation()
  const { monthTransactions, totalExpenses, CATEGORIES, settings } = useApp()
  const cur = settings.currency

  const expensesByCategory = monthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount
      return acc
    }, {})

  const sorted = Object.entries(expensesByCategory)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)

  if (sorted.length === 0) return null

  return (
    <div style={{ padding: '26px 16px 0' }}>
      <div className="section-head-row">
        <h2>{t('budget.categories')}</h2>
        <span className="t-caption">{t('budget.thisMonth')}</span>
      </div>

      <div className="card">
        <div style={{ padding: '4px 0' }}>
          {sorted.map(([catId, amount], i) => {
            const catDef = CATEGORIES.expense.find(c => c.id === catId) || { color: '#667085' }
            const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
            return (
              <motion.div
                key={catId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                style={{
                  padding: '12px 16px',
                  borderBottom: i < sorted.length - 1 ? '1px solid var(--c-sep)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {/* Tinted icon tile */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
                    background: catDef.color + '14',
                    color: catDef.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CategoryIcon id={catId} size={17} strokeWidth={2} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text)' }}>
                        {t(`categories.${catId}`)}
                      </span>
                      <span dir="ltr" className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-danger)' }}>
                        {formatAmount(amount, cur)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                      <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                        <motion.div
                          className="progress-fill"
                          style={{ background: catDef.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.65, delay: i * 0.05, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="num" style={{
                        fontSize: 11.5, color: 'var(--c-text3)', fontWeight: 500,
                        minWidth: 30, textAlign: 'end',
                      }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

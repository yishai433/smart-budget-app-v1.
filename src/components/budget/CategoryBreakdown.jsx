import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { motion } from 'framer-motion'
import { formatAmount } from '../../utils/format'

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
    <div style={{ padding: '0 16px', marginTop: 16 }}>
      <h2 className="section-title on-bg" style={{ padding: '0 4px 10px' }}>
        {t('budget.categories')}
      </h2>
      <div className="card">
        <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map(([catId, amount], i) => {
            const catDef = CATEGORIES.expense.find(c => c.id === catId) || { emoji: '📦', color: '#636366' }
            const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
            return (
              <motion.div
                key={catId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{catDef.emoji}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
                    {t(`categories.${catId}`)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-danger)' }}>
                    {formatAmount(amount, cur)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--c-text2)', minWidth: 36, textAlign: 'end' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    style={{ background: catDef.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

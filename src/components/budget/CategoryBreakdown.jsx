import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { monthLabel } from '../../utils/months'
import CategoryBudgetRows from './CategoryBudgetRows'

export default function CategoryBreakdown() {
  const { t } = useTranslation()
  const { monthTransactions, totalExpenses, settings, isCurrentMonth, monthKey, effectiveCategoryBudgets } = useApp()
  const lang = settings.language || 'he'

  const expensesByCategory = monthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount
      return acc
    }, {})

  // Top 5 by spending, plus every category that has a budget (even at ₪0 spent)
  const top5 = Object.entries(expensesByCategory)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([catId]) => catId)
  const ids = new Set([...top5, ...Object.keys(effectiveCategoryBudgets)])
  const rows = [...ids]
    .map(catId => ({ catId, amount: expensesByCategory[catId] || 0 }))
    .sort((a, b) => b.amount - a.amount)

  if (rows.length === 0) return null

  return (
    <div style={{ padding: '26px 16px 0' }}>
      <div className="section-head-row">
        <h2>{t('budget.categories')}</h2>
        <span className="t-caption">{isCurrentMonth ? t('budget.thisMonth') : monthLabel(monthKey, lang)}</span>
      </div>

      <div className="card">
        <CategoryBudgetRows rows={rows} totalExpenses={totalExpenses} />
      </div>
    </div>
  )
}

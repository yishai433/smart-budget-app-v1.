import { expensesByCategory, daysInMonth } from './insights'

const pad = (n) => String(n).padStart(2, '0')
export function prevKeyOf(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// Budget alerts for a month: categories (and the total) at 80%+ of their limit.
// Returns [{ id, level: 'over' | 'near', spent, limit, pct }], worst first.
export function budgetAlerts({ transactions, monthKey, categoryBudgets = {}, monthlyBudget = null }) {
  const spentBy = expensesByCategory(transactions, monthKey)
  const out = []
  Object.entries(categoryBudgets).forEach(([id, limit]) => {
    if (!(limit > 0)) return
    const spent = spentBy[id] || 0
    const pct = Math.round((spent / limit) * 100)
    if (pct >= 80) out.push({ id, level: pct > 100 ? 'over' : 'near', spent, limit, pct })
  })
  if (monthlyBudget > 0) {
    const spent = Object.values(spentBy).reduce((s, v) => s + v, 0)
    const pct = Math.round((spent / monthlyBudget) * 100)
    if (pct >= 80) out.push({ id: '__total', level: pct > 100 ? 'over' : 'near', spent, limit: monthlyBudget, pct })
  }
  return out.sort((a, b) => b.pct - a.pct)
}

// Summary of a finished month, compared with the month before it.
export function monthSummary({ transactions, monthKey, monthlyBudget = null }) {
  const by = expensesByCategory(transactions, monthKey)
  const total = Object.values(by).reduce((s, v) => s + v, 0)
  const income = transactions
    .filter(t => t.type === 'income' && t.date?.startsWith(monthKey))
    .reduce((s, t) => s + (t.amount || 0), 0)
  if (total === 0 && income === 0) return null
  const prevBy = expensesByCategory(transactions, prevKeyOf(monthKey))
  const prevTotal = Object.values(prevBy).reduce((s, v) => s + v, 0)
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0] || null
  return {
    total, income, prevTotal,
    changePct: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null,
    topCategory: top ? { id: top[0], amount: top[1] } : null,
    budget: monthlyBudget > 0 ? monthlyBudget : null,
    budgetDiff: monthlyBudget > 0 ? monthlyBudget - total : null, // > 0: stayed under
    perDay: total / daysInMonth(monthKey),
  }
}

// Pure helpers (no Firebase) so they can be tested on their own.

export const CATEGORY_NAMES = {
  salary: 'משכורת', freelance: 'פרילנס', gift: 'מתנה', investment: 'השקעות',
  housing: 'דיור', food: 'אוכל', transport: 'תחבורה', clothing: 'ביגוד', health: 'בריאות',
  education: 'לימודים', entertainment: 'בידור', subscriptions: 'מנויים', outings: 'יציאות',
  grooming: 'טיפוח', tech: 'טכנולוגיה', other: 'אחר',
}
export const catName = (id) => CATEGORY_NAMES[id] || 'אחר'

export const fmt = (n, cur = '₪') => {
  const r = Math.round((Number(n) || 0) * 100) / 100
  return `${cur}${r.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const pad = (n) => String(n).padStart(2, '0')
export const monthKeyOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Is this a big expense? Every expense of `minAmount` or more counts. When the
// household has enough history, also say how it compares with the usual amount.
// Returns null, or { ratio, base, scope } (ratio/base null without history).
export function unusualExpense(tx, history, { minAmount = 150, now = new Date(), days = 180 } = {}) {
  if (!(tx.amount >= minAmount)) return null
  const since = dayStr(new Date(now.getTime() - days * 86400000))
  const recent = history.filter(h => h.date >= since && h.amount > 0)
  const sameCat = recent.filter(h => h.category === tx.category).map(h => h.amount)
  if (sameCat.length >= 4) {
    const base = median(sameCat)
    return { ratio: base > 0 ? tx.amount / base : null, base, scope: 'category' }
  }
  return { ratio: null, base: null, scope: null }
}

// Effective per-category limits for a month: default limits, overridden per month
// (positive = other limit, null = no limit that month). Mirrors the app.
export function effectiveCategoryBudgets(hh, key) {
  const out = {}
  Object.entries(hh?.categoryBudgets || {}).forEach(([id, v]) => { if (v > 0) out[id] = v })
  Object.entries(hh?.categoryBudgetOverrides?.[key] || {}).forEach(([id, v]) => {
    if (v > 0) out[id] = v
    else if (v === null) delete out[id]
  })
  return out
}

// Budget status of one category and of the whole month after a new expense.
// Returns [{ id: catId | '__total', level: 'near' | 'over', spent, limit, pct }].
export function budgetStatus(transactions, hh, key, category) {
  const spentBy = {}
  let total = 0
  transactions.forEach(t => {
    if (t.type !== 'expense' || !t.date?.startsWith(key)) return
    spentBy[t.category] = (spentBy[t.category] || 0) + (t.amount || 0)
    total += t.amount || 0
  })
  const out = []
  const limits = effectiveCategoryBudgets(hh, key)
  const check = (id, spent, limit) => {
    if (!(limit > 0)) return
    const pct = Math.round((spent / limit) * 100)
    if (pct >= 80) out.push({ id, level: pct > 100 ? 'over' : 'near', spent, limit, pct })
  }
  if (limits[category]) check(category, spentBy[category] || 0, limits[category])
  check('__total', total, hh?.monthlyBudgets?.[key])
  return out
}

// The account (household) sets one "big expense" amount: household.bigExpenseAmount.
// An expense that reaches it or goes over counts. `fallback` applies when not set.
export function reachesBigAmount(limit, amount, fallback = 150) {
  const l = Number(limit) > 0 ? Number(limit) : fallback
  return amount >= l
}

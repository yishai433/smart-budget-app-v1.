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

// ───────── summaries, pace, jumps, duplicates ─────────
export const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export const monthLabelHe = (key) => MONTH_NAMES[Number(key.slice(5, 7)) - 1]
export const daysInMonthKey = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate() }
export const prevMonthKey = (key) => { const [y, m] = key.split('-').map(Number); return monthKeyOf(new Date(y, m - 2, 1)) }

const expensesOf = (txs) => txs.filter(t => t.type === 'expense')
function sumBy(list) {
  const by = {}; let total = 0
  list.forEach(t => { by[t.category] = (by[t.category] || 0) + (t.amount || 0); total += t.amount || 0 })
  return { by, total }
}
const topOf = (by) => { const e = Object.entries(by).sort((a, b) => b[1] - a[1])[0]; return e ? { id: e[0], amount: e[1] } : null }

// The 7 days before `now` (Sunday morning -> last Sunday..Saturday).
// pace = how much of the month's budget is used vs how much of the month has passed.
export function weeklySummary(txs, hh, now = new Date()) {
  const from = dayStr(new Date(now.getTime() - 7 * 86400000))
  const to = dayStr(new Date(now.getTime() - 86400000))
  const week = expensesOf(txs).filter(t => t.date >= from && t.date <= to)
  if (!week.length) return null
  const { by, total } = sumBy(week)
  const key = to.slice(0, 7)
  const budget = hh?.monthlyBudgets?.[key]
  let pace = null
  if (budget > 0) {
    const spent = sumBy(expensesOf(txs).filter(t => t.date?.startsWith(key) && t.date <= to)).total
    pace = { spentPct: Math.round((spent / budget) * 100), monthPct: Math.round((Number(to.slice(8, 10)) / daysInMonthKey(key)) * 100) }
  }
  return { total, count: week.length, top: topOf(by), pace }
}

// A finished month, compared with the one before it and with the budget.
export function monthlySummary(txs, hh, key) {
  const cur = sumBy(expensesOf(txs).filter(t => t.date?.startsWith(key)))
  if (!cur.total) return null
  const prev = sumBy(expensesOf(txs).filter(t => t.date?.startsWith(prevMonthKey(key)))).total
  const budget = hh?.monthlyBudgets?.[key]
  return {
    total: cur.total, prev,
    changePct: prev > 0 ? Math.round(((cur.total - prev) / prev) * 100) : null,
    top: topOf(cur.by),
    budget: budget > 0 ? budget : null,
    diff: budget > 0 ? budget - cur.total : null, // > 0: stayed under
  }
}

// Mid-month warning: from day 7, 50%+ of the budget used and at least 15 points
// ahead of the calendar. Not when already over budget (the budget alert covers that).
export function paceWarning(txs, hh, key, day) {
  const budget = hh?.monthlyBudgets?.[key]
  if (!(budget > 0) || day < 7) return null
  const days = daysInMonthKey(key)
  const spent = sumBy(expensesOf(txs).filter(t => t.date?.startsWith(key))).total
  const pct = spent / budget
  if (pct >= 1 || pct < 0.5 || pct < day / days + 0.15) return null
  return { spent, budget, pct: Math.round(pct * 100), day, projected: Math.round((spent / day) * days) }
}

// Categories that are well above the same period of last month.
export function categoryJumps(txs, key, day, { ratio = 1.5, minDiff = 150 } = {}) {
  if (day < 10) return []
  const upto = (k) => sumBy(expensesOf(txs).filter(t => t.date?.startsWith(k) && Number(t.date.slice(8, 10)) <= day)).by
  const cur = upto(key), prev = upto(prevMonthKey(key))
  return Object.entries(cur)
    .filter(([id, v]) => prev[id] > 0 && v >= prev[id] * ratio && v - prev[id] >= minDiff)
    .map(([id, v]) => ({ id, cur: v, prev: prev[id], pct: Math.round(((v - prev[id]) / prev[id]) * 100) }))
    .sort((a, b) => (b.cur - b.prev) - (a.cur - a.prev))
}

// Same amount + category, added within minutes of each other. Needs createdMs on each.
export function findDuplicate(tx, all, { withinMs = 10 * 60000, minAmount = 30 } = {}) {
  if (!(tx.amount >= minAmount) || !tx.createdMs) return null
  return all.find(o => o.id !== tx.id && o.type === 'expense' && !o.autoGenerated &&
    o.amount === tx.amount && o.category === tx.category &&
    o.createdMs && Math.abs(o.createdMs - tx.createdMs) <= withinMs) || null
}

// No scheduled messages on Shabbat (Friday afternoon to Saturday night).
export function isShabbat(now = new Date()) {
  const d = now.getDay(), h = now.getHours()
  return (d === 5 && h >= 14) || d === 6
}

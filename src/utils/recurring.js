// Upcoming recurring expenses, estimated from the recurring transactions the
// user already logged ("isRecurring" + "frequency"). Nothing is created
// automatically: this only reminds. An item is one recurring series, identified
// by its description (or category) and frequency; its next due date is projected
// from the most recent logged occurrence.
const PERIOD_DAYS = { weekly: 7, monthly: 30, yearly: 365 }

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const DAY_MS = 86400000
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)

// date of the n-th occurrence after `anchor`, keeping the day of month (clamped to month end)
function addPeriods(anchor, frequency, n) {
  if (frequency === 'weekly') return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * n)
  const months = frequency === 'yearly' ? 12 * n : n
  const first = new Date(anchor.getFullYear(), anchor.getMonth() + months, 1)
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(anchor.getDate(), lastDay))
}

export function getUpcomingRecurring(transactions, today = new Date(), withinDays = 7) {
  const now = startOfDay(today)
  const series = new Map()
  transactions.forEach(tx => {
    if (tx.type !== 'expense' || !tx.isRecurring || !PERIOD_DAYS[tx.frequency] || !tx.date) return
    const key = `${(tx.description || '').trim().toLowerCase() || tx.category}|${tx.frequency}`
    const prev = series.get(key)
    if (!prev || tx.date > prev.date) series.set(key, tx)
  })

  const out = []
  series.forEach((tx) => {
    const last = parseDate(tx.date)
    // first projected occurrence on or after today
    let n = 1
    let due = addPeriods(last, tx.frequency, n)
    while (due < now && n < 400) { n += 1; due = addPeriods(last, tx.frequency, n) }
    const daysUntil = daysBetween(now, due)
    if (daysUntil > withinDays) return
    // already logged for this period? (latest entry is closer to `due` than to the previous cycle)
    if (daysBetween(last, due) < PERIOD_DAYS[tx.frequency] / 2) return
    out.push({
      key: `${tx.description || tx.category}|${tx.frequency}`,
      name: (tx.description || '').trim(),
      category: tx.category,
      amount: tx.amount || 0,
      frequency: tx.frequency,
      due,
      daysUntil,
    })
  })
  return out.sort((a, b) => a.daysUntil - b.daysUntil)
}

import { formatAmount } from './format'
import { monthName } from './months'

const MIN_PCT = 25   // a category must change by at least this much (%) ...
const MIN_DIFF = 100 // ... and at least this much in money to be worth mentioning

const pad = (n) => String(n).padStart(2, '0')
function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// Expense totals per category for a month, counting only days up to uptoDay
export function expensesByCategory(transactions, key, uptoDay = 31) {
  const out = {}
  transactions.forEach(tx => {
    if (tx.type !== 'expense' || !tx.date?.startsWith(key)) return
    if (parseInt(tx.date.slice(8, 10), 10) > uptoDay) return
    out[tx.category] = (out[tx.category] || 0) + (tx.amount || 0)
  })
  return out
}

const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0)

// Automatic insights for the viewed month, compared with the previous month.
// For the running month the comparison is "same period": spending so far vs
// the previous month up to the same day, so a half-finished month isn't
// compared with a full one.
// Returns [{ id, tone: 'up' | 'down' | 'neutral', text }] — 'up' = spending rose (bad),
// 'down' = spending fell (good).
export function buildInsights({ transactions, monthKey, isCurrentMonth, today = new Date(), lang = 'he', cur, catName }) {
  const he = lang === 'he'
  const day = isCurrentMonth ? today.getDate() : daysInMonth(monthKey)
  if (isCurrentMonth && day < 3) return [] // too early in the month to say anything useful

  const prevKey = prevMonthKey(monthKey)
  const prevDay = Math.min(day, daysInMonth(prevKey))
  const curCats = expensesByCategory(transactions, monthKey, day)
  const prevCats = expensesByCategory(transactions, prevKey, prevDay)
  const curTotal = sum(curCats)
  const prevTotal = sum(prevCats)
  if (curTotal === 0 && prevTotal === 0) return []

  const money = (v) => formatAmount(Math.round(v), cur)
  const prevName = monthName(prevKey, lang)
  const out = []

  // 1 — overall change
  if (curTotal > 0 && prevTotal > 0) {
    const pct = Math.round(((curTotal - prevTotal) / prevTotal) * 100)
    const abs = Math.abs(pct)
    if (abs >= 5) {
      const more = pct > 0
      out.push({
        id: 'total', tone: more ? 'up' : 'down',
        text: he
          ? `${isCurrentMonth ? 'עד היום ' : ''}הוצאתם ${abs}% ${more ? 'יותר' : 'פחות'} ${isCurrentMonth ? `מאותה תקופה ב${prevName}` : `מאשר ב${prevName}`}`
          : `${isCurrentMonth ? 'So far you spent ' : 'You spent '}${abs}% ${more ? 'more' : 'less'} than ${isCurrentMonth ? `the same period in ${prevName}` : prevName}`,
      })
    } else {
      out.push({
        id: 'total', tone: 'neutral',
        text: he ? `ההוצאות דומות ${isCurrentMonth ? 'לאותה תקופה ' : ''}ב${prevName}` : `Spending is about the same as ${isCurrentMonth ? 'the same period in ' : ''}${prevName}`,
      })
    }
  }

  // 2 / 3 — biggest category rise and fall (only categories with history)
  const changes = Object.keys(curCats)
    .filter(c => prevCats[c] > 0)
    .map(c => ({ c, diff: curCats[c] - prevCats[c], pct: Math.round(((curCats[c] - prevCats[c]) / prevCats[c]) * 100) }))
  const rise = changes.filter(x => x.diff >= MIN_DIFF && x.pct >= MIN_PCT).sort((a, b) => b.diff - a.diff)[0]
  const fall = changes.filter(x => -x.diff >= MIN_DIFF && -x.pct >= MIN_PCT).sort((a, b) => a.diff - b.diff)[0]
  if (rise) {
    out.push({
      id: 'rise', tone: 'up',
      text: he
        ? `ב${catName(rise.c)} הוצאתם ${money(rise.diff)} יותר (+${rise.pct}%) לעומת ${prevName}`
        : `You spent ${money(rise.diff)} more on ${catName(rise.c)} (+${rise.pct}%) than in ${prevName}`,
    })
  }
  if (fall) {
    out.push({
      id: 'fall', tone: 'down',
      text: he
        ? `ב${catName(fall.c)} הוצאתם ${money(-fall.diff)} פחות (−${Math.abs(fall.pct)}%) לעומת ${prevName}`
        : `You spent ${money(-fall.diff)} less on ${catName(fall.c)} (−${Math.abs(fall.pct)}%) than in ${prevName}`,
    })
  }

  // 4 — biggest category, if it dominates
  const top = Object.entries(curCats).sort(([, a], [, b]) => b - a)[0]
  if (top && curTotal > 0) {
    const share = Math.round((top[1] / curTotal) * 100)
    if (share >= 30) {
      out.push({
        id: 'top', tone: 'neutral',
        text: he
          ? `ההוצאה הגדולה ביותר: ${catName(top[0])} (${share}% מכלל ההוצאות)`
          : `Biggest expense: ${catName(top[0])} (${share}% of all spending)`,
      })
    }
  }

  // 5 — daily average, as filler when there's little else to say
  if (curTotal > 0 && out.length < 3) {
    out.push({
      id: 'avg', tone: 'neutral',
      text: he ? `ממוצע יומי: ${money(curTotal / day)}` : `Daily average: ${money(curTotal / day)}`,
    })
  }

  return out.slice(0, 4)
}

// Cumulative spending per day for a month: index d-1 = total through day d
export function cumulativeByDay(transactions, key) {
  const days = daysInMonth(key)
  const perDay = new Array(days).fill(0)
  transactions.forEach(tx => {
    if (tx.type !== 'expense' || !tx.date?.startsWith(key)) return
    const d = parseInt(tx.date.slice(8, 10), 10)
    if (d >= 1 && d <= days) perDay[d - 1] += tx.amount || 0
  })
  let run = 0
  return perDay.map(v => (run += v))
}

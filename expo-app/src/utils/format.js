// ── Single source of truth for money formatting across the whole app ──
// Rule: whole numbers show no decimals, fractional amounts show exactly two.
//   10200    -> "10,200"
//   10200.5  -> "10,200.50"
//   5727.6   -> "5,727.60"
// Thousands separators are always applied (en-US grouping: comma + dot).
// This is display-only — it never touches stored values.

const NF0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const NF2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Core: grouped number string, no currency and no sign. Always non-negative.
export function formatNumber(amount) {
  // Round to cents first so float noise (e.g. 2715.0000001) reads as whole.
  const rounded = Math.round((Number(amount) || 0) * 100) / 100
  const abs = Math.abs(rounded)
  return Number.isInteger(abs) ? NF0.format(abs) : NF2.format(abs)
}

// "₪10,200" / "₪5,727.60" — currency + grouped number, no sign.
export function formatAmount(amount, cur = '₪') {
  return `${cur}${formatNumber(amount)}`
}

// Signed by transaction type — income "₪+10,200", expense "₪−5,727.60".
// (Sign sits after the currency symbol, matching the existing layout.)
export function formatMoney(amount, type, cur = '₪') {
  const sign = type === 'income' ? '+' : '−'
  return `${cur}${sign}${formatNumber(amount)}`
}

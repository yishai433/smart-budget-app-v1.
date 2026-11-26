// Money formatting, ported from the website's format.js.
const NF0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const NF2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatNumber(amount: number): string {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100
  const abs = Math.abs(rounded)
  return Number.isInteger(abs) ? NF0.format(abs) : NF2.format(abs)
}

export function formatAmount(amount: number, cur = '₪'): string {
  return `${cur}${formatNumber(amount)}`
}

// Signed with the currency, e.g. "₪−42.50" / "₪10,200".
export function money(amount: number, cur = '₪'): string {
  return `${amount < 0 ? '−' : ''}${cur}${formatNumber(amount)}`
}

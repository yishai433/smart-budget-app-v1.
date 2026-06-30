// Format a money amount: ₪−98.48 / ₪+98.48
// Always 2 decimal places; sign comes after currency symbol
export function formatMoney(amount, type, cur = '₪') {
  const sign = type === 'income' ? '+' : '−'
  return `${cur}${sign}${(amount || 0).toFixed(2)}`
}

// Format without a sign (for totals / category sums)
export function formatAmount(amount, cur = '₪') {
  return `${cur}${(amount || 0).toFixed(2)}`
}

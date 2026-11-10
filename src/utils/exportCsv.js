// CSV export of transactions. Includes a UTF-8 BOM so Excel opens Hebrew correctly.
const esc = (v) => {
  let s = v == null ? '' : String(v)
  // neutralise spreadsheet formulas (= + - @) typed into descriptions
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(transactions, { catName, lang = 'he' }) {
  const he = lang === 'he'
  const header = he
    ? ['תאריך', 'סוג', 'קטגוריה', 'תיאור', 'סכום', 'קבוע', 'תדירות']
    : ['Date', 'Type', 'Category', 'Description', 'Amount', 'Recurring', 'Frequency']
  const rows = [...transactions]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(tx => [
      tx.date,
      tx.type === 'income' ? (he ? 'הכנסה' : 'Income') : (he ? 'הוצאה' : 'Expense'),
      catName(tx.category),
      tx.description || '',
      tx.amount,
      tx.isRecurring ? (he ? 'כן' : 'Yes') : '',
      tx.frequency || '',
    ])
  return '﻿' + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

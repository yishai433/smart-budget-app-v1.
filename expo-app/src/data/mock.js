// Demo data for the visual skeleton. No server, no account — just enough to make
// the budget screen feel real. Numbers are in ₪ for the current month.

export const CURRENCY = '₪'
export const MONTHLY_BUDGET = 6300

// id, label (Hebrew), emoji and color — mirrors the web app's category list.
export const CATEGORIES = {
  housing:       { label: 'דיור',     emoji: '🏠', color: '#A8553A' },
  food:          { label: 'מזון',     emoji: '🍔', color: '#D08A2E' },
  transport:     { label: 'תחבורה',   emoji: '🚗', color: '#56633F' },
  entertainment: { label: 'בילויים',  emoji: '🎬', color: '#C77B5C' },
  health:        { label: 'בריאות',   emoji: '❤️', color: '#C0524F' },
  subscriptions: { label: 'מנויים',   emoji: '📡', color: '#6B5FA0' },
  clothing:      { label: 'ביגוד',    emoji: '👕', color: '#9A6B8E' },
  other:         { label: 'שונות',    emoji: '📦', color: '#8A8272' },
  salary:        { label: 'משכורת',   emoji: '💼', color: '#56633F' },
}

// Per-category budget for the month (used for the breakdown bars).
export const CATEGORY_BUDGETS = {
  housing: 2500, food: 1800, transport: 700, entertainment: 500, health: 300, subscriptions: 200, clothing: 300,
}

// A few days of transactions this month.
export const TRANSACTIONS = [
  { id: 't1',  type: 'income',  category: 'salary',        amount: 11200, desc: 'משכורת נובמבר',     date: '2026-11-01' },
  { id: 't2',  type: 'expense', category: 'housing',       amount: 2500,  desc: 'שכר דירה',          date: '2026-11-01' },
  { id: 't3',  type: 'expense', category: 'food',          amount: 342.9, desc: 'שופרסל',            date: '2026-11-03' },
  { id: 't4',  type: 'expense', category: 'subscriptions', amount: 54.9,  desc: 'נטפליקס',           date: '2026-11-04' },
  { id: 't5',  type: 'expense', category: 'transport',     amount: 220,   desc: 'דלק',               date: '2026-11-06' },
  { id: 't6',  type: 'expense', category: 'food',          amount: 128.5, desc: 'רמי לוי',           date: '2026-11-09' },
  { id: 't7',  type: 'expense', category: 'entertainment', amount: 180,   desc: 'מסעדה',             date: '2026-11-12' },
  { id: 't8',  type: 'expense', category: 'health',        amount: 95,    desc: 'בית מרקחת',         date: '2026-11-14' },
  { id: 't9',  type: 'expense', category: 'clothing',      amount: 249.9, desc: 'קסטרו',             date: '2026-11-18' },
  { id: 't10', type: 'expense', category: 'transport',     amount: 64,    desc: 'רב-קו',             date: '2026-11-20' },
  { id: 't11', type: 'expense', category: 'food',          amount: 211.2, desc: 'יינות ביתן',        date: '2026-11-23' },
  { id: 't12', type: 'expense', category: 'entertainment', amount: 120,   desc: 'קולנוע',            date: '2026-11-25' },
]

export const totals = (() => {
  let income = 0, expenses = 0
  const byCat = {}
  for (const tx of TRANSACTIONS) {
    if (tx.type === 'income') income += tx.amount
    else { expenses += tx.amount; byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount }
  }
  return { income, expenses, byCat, saved: income - expenses }
})()

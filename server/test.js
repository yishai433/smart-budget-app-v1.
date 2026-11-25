import assert from 'node:assert/strict'
import { unusualExpense, budgetStatus, effectiveCategoryBudgets, median } from './logic.js'

const now = new Date('2026-11-25T12:00:00')
const h = (category, amount, date = '2026-11-01') => ({ category, amount, date, type: 'expense' })
const food = [60, 80, 90, 70, 100].map(a => h('food', a))

assert.equal(median([3, 1, 2]), 2)
assert.equal(median([1, 2, 3, 4]), 2.5)
// at/above the minimum -> flagged, with the ratio when there is category history
let u = unusualExpense({ category: 'food', amount: 400 }, food, { now })
assert.ok(u && u.scope === 'category' && Math.round(u.ratio) === 5)
assert.ok(unusualExpense({ category: 'food', amount: 200 }, food, { now }))
// below the minimum is never flagged
assert.equal(unusualExpense({ category: 'food', amount: 149 }, food, { now }), null)
// no history: still flagged (this is the case that used to be silent)
u = unusualExpense({ category: 'tech', amount: 200 }, [], { now })
assert.ok(u && u.ratio === null)
// old history is ignored for the comparison
u = unusualExpense({ category: 'food', amount: 400 }, food.map(x => ({ ...x, date: '2025-01-01' })), { now })
assert.ok(u && u.ratio === null)

const hh = { monthlyBudgets: { '2026-11': 1000 }, categoryBudgets: { food: 500, tech: 300 }, categoryBudgetOverrides: { '2026-11': { food: 200, tech: null } } }
assert.deepEqual(effectiveCategoryBudgets(hh, '2026-11'), { food: 200 })
assert.deepEqual(effectiveCategoryBudgets(hh, '2026-10'), { food: 500, tech: 300 })

const txs = [h('food', 170), h('transport', 700)]
let st = budgetStatus(txs, hh, '2026-11', 'food')
assert.deepEqual(st.map(s => [s.id, s.level, s.pct]), [['food', 'near', 85], ['__total', 'near', 87]])
st = budgetStatus([...txs, h('food', 50)], hh, '2026-11', 'food')
assert.deepEqual(st.map(s => [s.id, s.level]), [['food', 'over'], ['__total', 'near']])
// other category without a limit only reports the total
assert.deepEqual(budgetStatus(txs, hh, '2026-11', 'transport').map(s => s.id), ['__total'])
// income is ignored
assert.deepEqual(budgetStatus([{ type: 'income', amount: 9999, date: '2026-11-02', category: 'salary' }], hh, '2026-11', 'salary'), [])
console.log('כל הבדיקות עברו')

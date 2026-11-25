import assert from 'node:assert/strict'
import { unusualExpense, budgetStatus, effectiveCategoryBudgets, median } from './logic.js'

const now = new Date('2026-11-25T12:00:00')
const h = (category, amount, date = '2026-11-01') => ({ category, amount, date, type: 'expense' })
const food = [60, 80, 90, 70, 100].map(a => h('food', a))

assert.equal(median([3, 1, 2]), 2)
assert.equal(median([1, 2, 3, 4]), 2.5)
// 400 vs median 80 -> x5, flagged
assert.ok(unusualExpense({ category: 'food', amount: 400 }, food, { now }))
// 200 vs median 80 -> x2.5, normal
assert.equal(unusualExpense({ category: 'food', amount: 200 }, food, { now }), null)
// below the minimum amount is never flagged
assert.equal(unusualExpense({ category: 'food', amount: 100 }, [10, 10, 10, 10].map(a => h('food', a)), { now }), null)
// no history -> not flagged
assert.equal(unusualExpense({ category: 'tech', amount: 5000 }, [], { now }), null)
// old history (older than 180 days) ignored
assert.equal(unusualExpense({ category: 'food', amount: 400 }, food.map(x => ({ ...x, date: '2025-01-01' })), { now }), null)
// fallback to all categories needs a clearly bigger jump (x5)
const mixed = Array.from({ length: 10 }, (_, i) => h(i % 2 ? 'food' : 'transport', 100))
assert.equal(unusualExpense({ category: 'tech', amount: 400 }, mixed, { now }), null)
assert.ok(unusualExpense({ category: 'tech', amount: 600 }, mixed, { now }))

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

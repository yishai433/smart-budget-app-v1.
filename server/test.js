import assert from 'node:assert/strict'
import { weeklySummary, monthlySummary, paceWarning, categoryJumps, findDuplicate, isShabbat, prevMonthKey, monthLabelHe, reachesBigAmount, unusualExpense, budgetStatus, effectiveCategoryBudgets, median } from './logic.js'

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
// account threshold: reaching it counts, default when unset
assert.equal(reachesBigAmount(300, 250), false)
assert.equal(reachesBigAmount(300, 300), true)
assert.equal(reachesBigAmount(50, 60), true)
assert.equal(reachesBigAmount(undefined, 149), false)
assert.equal(reachesBigAmount(undefined, 150), true)
assert.equal(reachesBigAmount('x', 200, 150), true)

// ── weekly summary (Sunday 2026-11-22 morning -> covers 15..21) ──
const sun = new Date('2026-11-22T09:00:00')
const wk = [h('food', 300, '2026-11-16'), h('transport', 120, '2026-11-18'), h('food', 100, '2026-11-21'), h('food', 999, '2026-11-10'), h('food', 50, '2026-11-22')]
const ws = weeklySummary(wk, { monthlyBudgets: { '2026-11': 1000 } }, sun)
assert.equal(ws.total, 520)
assert.equal(ws.count, 3)
assert.deepEqual(ws.top, { id: 'food', amount: 400 })
assert.deepEqual(ws.pace, { spentPct: 152, monthPct: 70 }) // 1519 spent in Nov up to the 21st
assert.equal(weeklySummary([h('food', 5, '2026-11-01')], {}, sun), null)

// ── monthly summary ──
const ms = monthlySummary([h('food', 800, '2026-10-05'), h('food', 400, '2026-09-05'), { type: 'income', amount: 9000, date: '2026-10-01', category: 'salary' }], { monthlyBudgets: { '2026-10': 1000 } }, '2026-10')
assert.equal(ms.total, 800); assert.equal(ms.changePct, 100); assert.equal(ms.diff, 200)
assert.equal(monthlySummary([], {}, '2026-10'), null)
assert.equal(prevMonthKey('2026-01'), '2025-12')
assert.equal(monthLabelHe('2026-10'), 'אוקטובר')

// ── pace: day 15 of a 30-day month, 70% used ──
const pace = paceWarning([h('food', 700, '2026-11-03')], { monthlyBudgets: { '2026-11': 1000 } }, '2026-11', 15)
assert.deepEqual([pace.pct, pace.projected], [70, 1400])
assert.equal(paceWarning([h('food', 400, '2026-11-03')], { monthlyBudgets: { '2026-11': 1000 } }, '2026-11', 15), null) // 40% < 50%
assert.equal(paceWarning([h('food', 520, '2026-11-03')], { monthlyBudgets: { '2026-11': 1000 } }, '2026-11', 15), null) // only 2 points ahead of 50%
assert.equal(paceWarning([h('food', 1200, '2026-11-03')], { monthlyBudgets: { '2026-11': 1000 } }, '2026-11', 15), null) // already over
assert.equal(paceWarning([h('food', 700, '2026-11-03')], { monthlyBudgets: { '2026-11': 1000 } }, '2026-11', 5), null) // too early
assert.equal(paceWarning([h('food', 700, '2026-11-03')], {}, '2026-11', 15), null) // no budget

// ── category jumps: same period (up to the 15th) vs last month ──
const jt = [h('food', 100, '2026-10-05'), h('food', 900, '2026-10-25'), h('food', 400, '2026-11-05'), h('transport', 100, '2026-10-05'), h('transport', 120, '2026-11-05'), h('tech', 500, '2026-11-05')]
const jumps = categoryJumps(jt, '2026-11', 15)
assert.deepEqual(jumps.map(j => [j.id, j.cur, j.prev, j.pct]), [['food', 400, 100, 300]])
assert.deepEqual(categoryJumps(jt, '2026-11', 9), []) // too early in the month

// ── duplicates ──
const base = { type: 'expense', category: 'food', amount: 85, createdMs: 1_000_000 }
const d1 = { ...base, id: 'a' }, d2 = { ...base, id: 'b', createdMs: 1_000_000 + 4 * 60000 }
assert.equal(findDuplicate(d2, [d1, d2]).id, 'a')
assert.equal(findDuplicate({ ...d2, createdMs: 1_000_000 + 30 * 60000 }, [d1]), null)          // too far apart
assert.equal(findDuplicate(d2, [{ ...d1, category: 'transport' }]), null)                     // other category
assert.equal(findDuplicate({ ...d2, amount: 20 }, [{ ...d1, amount: 20 }]), null)             // tiny amounts ignored
assert.equal(findDuplicate(d2, [{ ...d1, autoGenerated: true }]), null)                       // recurring bookings ignored

// ── Shabbat ──
assert.equal(isShabbat(new Date('2026-11-27T15:00:00')), true)  // Friday 15:00
assert.equal(isShabbat(new Date('2026-11-27T10:00:00')), false)
assert.equal(isShabbat(new Date('2026-11-28T12:00:00')), true)  // Saturday
assert.equal(isShabbat(new Date('2026-11-29T09:00:00')), false) // Sunday
// recurring: daily, every-N-weeks, monthly and old entries without interval
import { getDueRecurring, intervalLabel } from './recurring.js'
const rec = (o) => ({ id: 'x' + Math.random(), type: 'expense', category: 'subscriptions', amount: 50, isRecurring: true, description: 'שירות', ...o })
const today = new Date('2026-11-25T10:00:00')
let due = getDueRecurring([rec({ date: '2026-11-20', frequency: 'daily' })], today)
assert.deepEqual(due.map(d => d.data.date), ['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'])
due = getDueRecurring([rec({ date: '2026-11-01', frequency: 'weekly', interval: 2 })], today)
assert.deepEqual(due.map(d => d.data.date), ['2026-11-15'])
due = getDueRecurring([rec({ date: '2026-10-25', frequency: 'monthly' })], today)
assert.deepEqual(due.map(d => d.data.date), ['2026-11-25'])
due = getDueRecurring([rec({ date: '2026-10-25', frequency: 'monthly' }), rec({ date: '2026-11-25', frequency: 'monthly', autoGenerated: true })], today)
assert.equal(due.length, 0)
assert.equal(intervalLabel('weekly', 2, true), 'כל 2 שבועות')
assert.equal(intervalLabel('weekly', 1, true), null)
// price-file parsing (UTF-16 stores file, items, promotions)
import { decodeText, parseStores, parseItems, parsePromos } from './prices-probe.js'
const storesXml = '<Root><Stores><STORE><STOREID>12</STOREID><STORENAME>שופרסל דיל חצור</STORENAME><ADDRESS>הרצל 1</ADDRESS><CITY>חצור הגלילית</CITY></STORE></Stores></Root>'
const s16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(storesXml, 'utf16le')])
assert.equal(parseStores(decodeText(s16))[0].city, 'חצור הגלילית')
const it = parseItems('<Items><Item><ItemCode>7290000000001</ItemCode><ItemName>חלב 3%</ItemName><ItemPrice>6.9</ItemPrice></Item></Items>')
assert.equal(it[0].code, '7290000000001'); assert.equal(it[0].price, 6.9)
const pr = parsePromos('<Promotions><Promotion><PromotionId>5</PromotionId><PromotionDescription>2 ב-10</PromotionDescription><PromotionEndDate>2026-12-01</PromotionEndDate><DiscountedPrice>5</DiscountedPrice><PromotionItems><Item><ItemCode>111</ItemCode></Item></PromotionItems></Promotion></Promotions>')
assert.equal(pr[0].items[0], '111'); assert.equal(pr[0].price, 5)
// prices module: real-format promotion, coupon skipped, lookup variants
import { parsePromos as pp, parseItems as pi, lookup } from './prices.js'
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'
const promoXml = `<Promotions>
<Promotion><PromotionID>1</PromotionID><PromotionDescription>קופון</PromotionDescription><PromotionStartDateTime>2014-07-16T00:00:00.000</PromotionStartDateTime><PromotionEndDateTime>2031-01-01T02:59:00.000</PromotionEndDateTime><ClubID>0 - כלל הלקוחות</ClubID><AdditionalIsCoupon>1</AdditionalIsCoupon><Groups><Group><PromotionItems><PromotionItem><ItemCode>111</ItemCode><MinQty>1.00</MinQty><DiscountedPrice>0.00</DiscountedPrice></PromotionItem></PromotionItems></Group></Groups></Promotion>
<Promotion><PromotionID>2</PromotionID><PromotionDescription>2 ב-10</PromotionDescription><PromotionStartDateTime>2026-11-01T00:00:00.000</PromotionStartDateTime><PromotionEndDateTime>2026-12-01T00:00:00.000</PromotionEndDateTime><ClubID>5 - מועדון</ClubID><AdditionalIsCoupon>0</AdditionalIsCoupon><Groups><Group><PromotionItems><PromotionItem><ItemCode>222</ItemCode><MinQty>2.00</MinQty><DiscountRate></DiscountRate><DiscountedPrice>10.00</DiscountedPrice></PromotionItem></PromotionItems></Group></Groups></Promotion>
<Promotion><PromotionID>3</PromotionID><PromotionDescription>פג</PromotionDescription><PromotionStartDateTime>2026-01-01T00:00:00.000</PromotionStartDateTime><PromotionEndDateTime>2026-02-01T00:00:00.000</PromotionEndDateTime><ClubID>0</ClubID><Groups><Group><PromotionItems><PromotionItem><ItemCode>333</ItemCode></PromotionItem></PromotionItems></Group></Groups></Promotion></Promotions>`
const promos = pp(promoXml, new Date('2026-11-25T10:00:00'))
assert.equal(promos['111'], undefined)
assert.equal(promos['333'], undefined)
assert.equal(promos['222'][0].price, 10); assert.equal(promos['222'][0].club, true); assert.equal(promos['222'][0].minQty, 2)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-'))
fs.mkdirSync(path.join(tmp, 'prices'))
fs.writeFileSync(path.join(tmp, 'prices', 'shufersal-190.json'), JSON.stringify({ key: 'shufersal-190', label: 'ש', chain: 'shufersal', fetchedAt: 1, items: { '7290000000001': ['חלב', 6.9, ''] }, promos: {} }))
const found = lookup(tmp, '07290000000001', ['shufersal-190'])
assert.equal(found.length, 1); assert.equal(found[0].price, 6.9)
assert.equal(lookup(tmp, '999', ['shufersal-190']).length, 0)
console.log('כל הבדיקות עברו')

// Cerberus chains: key format + store list in Cerberus' mixed-case XML
import { validKey, parseStoreList } from './prices.js'
assert.ok(validKey('osherad-12') && validKey('shufersal-190') && !validKey('osherad-x') && !validKey('foo-1'))
const cb = parseStoreList('<Root><SubChains><SubChain><Stores><Store><StoreId>12</StoreId><StoreName>קרית שמונה</StoreName><Address>הרצל 1</Address><City>קרית שמונה</City></Store></Stores></SubChain></SubChains></Root>')
assert.equal(cb[0].id, '12'); assert.equal(cb[0].city, 'קרית שמונה')
console.log('Cerberus: בדיקות עברו')

// product search + basket comparison
import { searchProducts, compareBasket } from './prices.js'
import fs2 from 'node:fs'
import os2 from 'node:os'
import path2 from 'node:path'
{
  const dir = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'pr-'))
  fs2.mkdirSync(path2.join(dir, 'prices'))
  const mk = (key, label, items) => fs2.writeFileSync(path2.join(dir, 'prices', key + '.json'), JSON.stringify({ key, label, chain: 'x', store: '1', fetchedAt: Date.now(), items, promos: {} }))
  mk('shufersal-1', 'שופרסל א', { '7290000000011': ['חלב תנובה 3% 1 ליטר', 6.9, ''], '7290000000028': ['לחם אחיד פרוס', 8, ''] })
  mk('sapir-1', 'ספיר ב', { '07290000000011': ['חלב תנובה 3%', 6.5, ''], '7290000000035': ['חלב טרה 3%', 5.9, ''] })
  const r = searchProducts(dir, "חלב 3%", ['shufersal-1', 'sapir-1'])
  assert.equal(r[0].code, '7290000000011')                  // leading zero unified, sold in both
  assert.equal(Object.keys(r[0].prices).length, 2)
  assert.equal(r.length, 2)
  const c = compareBasket(dir, [{ code: '7290000000011', qty: 2 }, { code: '7290000000028', qty: 1 }], ['shufersal-1', 'sapir-1'])
  assert.equal(c[0].total, 21.8); assert.equal(c[0].missing.length, 0)
  assert.equal(c[1].total, 13); assert.deepEqual(c[1].missing, ['7290000000028'])
  // relevance: plain milk first, "ריבת חלב" / protein bars only when there is too little else
  mk('shufersal-2', 'שופרסל ב', {
    '1': ['חלב 3% 1 ליטר', 6.9, ''], '2': ['חלב שקדים 1 ליטר', 12, ''], '3': ['ריבת חלב טילון', 9, ''], '4': ['מטרנה אבקת חלב', 40, ''],
    '5': ['חלב טרי 1% 1 ליטר', 6.5, ''], '6': ['חלב מועשר 3%', 7, ''], '7': ['חלב סויה', 11, ''], '8': ['חלב עיזים', 15, ''], '9': ['חלב עמיד 3%', 5, ''], '10': ['שוקולית חלב', 4, ''],
  })
  const m = searchProducts(dir, 'חלב', ['shufersal-2'])
  assert.ok(m.every(x => !/ריבת|מטרנה|שוקולית/.test(x.name)), 'weak matches are hidden when there are enough good ones')
  assert.equal(m[0].name.startsWith('חלב'), true)
  assert.equal(searchProducts(dir, 'טילון', ['shufersal-2'])[0].name, 'ריבת חלב טילון')   // asking for a brand still finds it
  console.log('חיפוש וסל: בדיקות עברו')
}

// on-device search index: compact, deduped, prices aligned to keys
import { buildIndex } from './prices.js'
{
  const dir = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'ix-'))
  fs2.mkdirSync(path2.join(dir, 'prices'))
  const mk = (key, items) => fs2.writeFileSync(path2.join(dir, 'prices', key + '.json'), JSON.stringify({ key, label: key, chain: 'x', store: '1', fetchedAt: Date.now(), items, promos: {} }))
  mk('shufersal-9001', { '7290000000011': ['חלב 3% ליטר ארוך', 6.9, ''], '7290000000028': ['לחם', 8, ''] })
  mk('sapir-9002', { '07290000000011': ['חלב 3%', 6.5, ''], '7290000000035': ['ביצים', 12, ''] })
  const idx = buildIndex(dir, ['shufersal-9001', 'sapir-9002'])
  assert.deepEqual(idx.keys, ['shufersal-9001', 'sapir-9002'])
  assert.equal(idx.items.length, 3)                                  // milk deduped across the zero-padded barcode
  const milk = idx.items.find(r => r[0] === '7290000000011')
  assert.equal(milk[1], 'חלב 3%')                                    // shortest name kept
  assert.deepEqual(milk[2], [6.9, 6.5])                              // one price per key, in order
  const eggs = idx.items.find(r => r[0] === '7290000000035')
  assert.deepEqual(eggs[2], [null, 12])                              // missing in branch 0
  console.log('אינדקס חיפוש: בדיקות עברו')
}

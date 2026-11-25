// Smart Budget home server.
// Runs at home, connects OUT to Firebase (no open ports), watches for new
// expenses and sends push notifications to the household's phones.
import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'
import {
  catName, fmt, monthKeyOf, dayStr, budgetStatus, unusualExpense, reachesBigAmount,
  weeklySummary, monthlySummary, paceWarning, categoryJumps, findDuplicate,
  monthLabelHe, prevMonthKey, isShabbat,
} from './logic.js'
import { getDueRecurring } from './recurring.js'
import { STORES, refreshAll, lookup, loadStore, validKey, refreshCatalog, loadCatalog, catalogAge, searchProducts, compareBasket, warm } from './prices.js'

const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/run/secrets/firebase.json'
const DATA_DIR = process.env.DATA_DIR || './data'
const APP_URL = process.env.APP_URL || 'https://yishai433.github.io/smart-budget-app-v1./'
const UNUSUAL_MIN = Number(process.env.UNUSUAL_MIN || 150)     // expenses of this amount or more notify the others
const SKIP_SHABBAT = process.env.SKIP_SHABBAT !== '0'            // no scheduled messages on Shabbat
const FRESH_MS = 10 * 60 * 1000                                // ignore transactions older than this

if (!fs.existsSync(KEY_FILE)) {
  console.error(`לא נמצא מפתח שירות ב-${KEY_FILE}. ראה README.`)
  process.exit(1)
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'))) })
const db = admin.firestore()
const messaging = admin.messaging()
const { FieldValue, Timestamp } = admin.firestore
const log = (...a) => console.log(new Date().toISOString(), ...a)

// ── tiny persistent state (so a restart doesn't repeat notifications) ──
fs.mkdirSync(DATA_DIR, { recursive: true })
const STATE_FILE = path.join(DATA_DIR, 'state.json')
let state = { tx: [], alerts: {}, tests: {}, jobs: {}, dups: [] }
try { state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } } catch { /* first run */ }
let dirty = false
const save = () => {
  if (!dirty) return
  state.tx = state.tx.slice(-500)
  state.dups = state.dups.slice(-300)
  const jobCut = Date.now() - 100 * 86400000
  Object.keys(state.jobs).forEach(k => { if (state.jobs[k] < jobCut) delete state.jobs[k] })
  const keep = monthKeyOf(new Date(Date.now() - 100 * 86400000))
  Object.keys(state.alerts).forEach(k => { if (k.split('|')[1] < keep) delete state.alerts[k] })
  fs.writeFileSync(STATE_FILE + '.tmp', JSON.stringify(state))
  fs.renameSync(STATE_FILE + '.tmp', STATE_FILE)
  dirty = false
}
setInterval(save, 15000)

// ── sending ──
async function sendToUsers(uids, { title, body, tag }, prefKey) {
  const snaps = await Promise.all([...new Set(uids)].map(u => db.doc(`pushTokens/${u}`).get()))
  const tokens = []
  snaps.forEach(s => {
    if (!s.exists) return
    const d = s.data()
    if (prefKey && d.prefs && d.prefs[prefKey] === false) return
    ;(d.tokens || []).forEach(t => tokens.push({ uid: s.id, token: t }))
  })
  if (!tokens.length) { log('אין מכשירים רשומים לשליחה:', title); return 0 }
  // data-only message: the app's service worker shows it
  const res = await messaging.sendEachForMulticast({
    tokens: tokens.map(t => t.token),
    data: { title, body, tag: tag || 'sb', url: APP_URL },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    android: { priority: 'high' },
  })
  const dead = new Map()
  res.responses.forEach((r, i) => {
    const code = r.error?.code
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      const { uid, token } = tokens[i]
      dead.set(uid, [...(dead.get(uid) || []), token])
    } else if (r.error) log('שגיאת שליחה:', code)
  })
  await Promise.all([...dead].map(([uid, ts]) =>
    db.doc(`pushTokens/${uid}`).update({ tokens: FieldValue.arrayRemove(...ts) }).catch(() => {})))
  log(`נשלח "${title}" ל-${res.successCount}/${tokens.length} מכשירים`)
  return res.successCount
}

// ── recurring expense booked: tell the whole household ──
// Occurrences booked by this server are announced once per household by runRecurring
// (so a catch-up of several days is one message); the ones the app books itself arrive here.
const announcedRecurring = new Set()
const recurringLine = (t, cur) => `${(t.description || '').trim() || catName(t.category)} · ${fmt(t.amount, cur)}`

// ── new transaction ──
async function onNewTransaction(id, t) {
  if (t.type !== 'expense' || !t.householdId) return
  const hid = t.householdId
  const [hhSnap, txSnap] = await Promise.all([
    db.doc(`households/${hid}`).get(),
    db.collection('transactions').where('householdId', '==', hid).get(),
  ])
  if (!hhSnap.exists) return
  const hh = hhSnap.data()
  const members = [...new Set([hid, ...(hh.members || [])])]
  const cur = hh.settings?.currency || '₪'
  const who = t.createdByName || 'מישהו מהבית'
  const all = txSnap.docs.map(d => ({ id: d.id, ...d.data(), createdMs: d.data().createdAt?.toMillis?.() || 0 }))

  // 0) a recurring expense was booked automatically
  if (t.autoGenerated && !announcedRecurring.has(id)) {
    await sendToUsers(members, {
      title: 'הוצאה קבועה נרשמה',
      body: `${recurringLine(t, cur)} · ${catName(t.category)}`,
      tag: `recurring-${id}`,
    }, 'recurring')
  }

  // 1) big expense: the account sets one amount (household.bigExpenseAmount).
  //    The other members are told; the person who added it already knows.
  //    On a single-member account there is nobody else, so that person is told.
  if (!t.autoGenerated && reachesBigAmount(hh.bigExpenseAmount, t.amount, UNUSUAL_MIN)) {
    const u = unusualExpense(t, all.filter(x => x.id !== id && x.type === 'expense'), { minAmount: 0 })
    const others = t.createdBy ? members.filter(m => m !== t.createdBy) : members
    const to = others.length ? others : members
    const times = u?.ratio && u.ratio >= 2 ? ` (פי ${Math.round(u.ratio * 10) / 10} מהרגיל)` : ''
    await sendToUsers(to, {
      title: 'הוצאה גדולה',
      body: `${who} רשם/ה ${fmt(t.amount, cur)} ב${catName(t.category)}${times}`,
      tag: `unusual-${id}`,
    }, 'unusual')
  }

  // 1b) suspicious duplicate: same amount + category within minutes -> everyone
  if (!t.autoGenerated) {
    const me = all.find(x => x.id === id)
    const other = me && findDuplicate(me, all)
    if (other && !state.dups.includes(id) && !state.dups.includes(other.id)) {
      state.dups.push(id, other.id); dirty = true
      const mins = Math.max(1, Math.round(Math.abs(me.createdMs - other.createdMs) / 60000))
      await sendToUsers(members, {
        title: 'הוצאה כפולה?',
        body: `${fmt(t.amount, cur)} ב${catName(t.category)} נרשמה פעמיים תוך ${mins} דקות. כדאי לבדוק ולמחוק אחת.`,
        tag: `dup-${id}`,
      }, 'duplicate')
    }
  }

  // 2) budget alerts -> everyone, once per level
  const key = (t.date || '').slice(0, 7)
  if (key && key >= monthKeyOf(new Date(Date.now() - 31 * 86400000))) {
    for (const s of budgetStatus(all, hh, key, t.category)) {
      const k = `${hid}|${key}|${s.id}|${s.level}`
      const nearK = `${hid}|${key}|${s.id}|near`
      if (state.alerts[k]) continue
      state.alerts[k] = true
      if (s.level === 'over') state.alerts[nearK] = true // jumped straight over: don't send "near" later
      dirty = true
      const name = s.id === '__total' ? 'התקציב החודשי' : `תקציב ${catName(s.id)}`
      await sendToUsers(members, s.level === 'over'
        ? { title: 'חרגתם מהתקציב', body: `${name}: ${fmt(s.spent, cur)} מתוך ${fmt(s.limit, cur)} (${s.pct}%)`, tag: `over-${s.id}` }
        : { title: 'מתקרבים לתקציב', body: `${name}: ${s.pct}% נוצלו (${fmt(s.spent, cur)} מתוך ${fmt(s.limit, cur)})`, tag: `near-${s.id}` },
      'budget')
    }
  }
}

function watchTransactions() {
  const since = Timestamp.fromMillis(Date.now() - FRESH_MS)
  db.collection('transactions').where('createdAt', '>=', since).onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      if (ch.type !== 'added') return
      const id = ch.doc.id
      const t = ch.doc.data()
      const at = t.createdAt?.toMillis?.() || 0
      if (!at || Date.now() - at > FRESH_MS || state.tx.includes(id)) return
      state.tx.push(id); dirty = true
      onNewTransaction(id, t).catch(e => log('שגיאה בעיבוד עסקה', id, e.message))
    })
  }, e => { log('האזנה לעסקאות נפלה:', e.message); setTimeout(watchTransactions, 10000) })
  log('מאזין להוצאות חדשות')
}

// "Send a test" button in the app: it writes testRequest on the user's pushTokens doc.
function watchTests() {
  db.collection('pushTokens').onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      if (ch.type === 'removed') return
      const ms = ch.doc.data().testRequest?.toMillis?.() || 0
      if (!ms || Date.now() - ms > 2 * 60 * 1000 || state.tests[ch.doc.id] >= ms) return
      state.tests[ch.doc.id] = ms; dirty = true
      sendToUsers([ch.doc.id], { title: 'השרת הביתי מחובר', body: 'מעכשיו תקבלו כאן התראות על הוצאות גדולות וחריגה מהתקציב', tag: 'test' })
        .catch(e => log('שגיאת בדיקה', e.message))
    })
  }, e => { log('האזנה לבדיקות נפלה:', e.message); setTimeout(watchTests, 10000) })
}

// ── scheduled messages (weekly / monthly summary, pace, category jumps) ──
async function forEachHousehold(fn) {
  const snap = await db.collection('households').get()
  for (const d of snap.docs) {
    try { await fn(d.id, d.data()) } catch (e) { log('שגיאה במשק בית', d.id, e.message) }
  }
}
const loadTxs = async (hid) =>
  (await db.collection('transactions').where('householdId', '==', hid).get()).docs.map(d => ({ id: d.id, ...d.data() }))
const membersOf = (hid, hh) => [...new Set([hid, ...(hh.members || [])])]
const curOf = (hh) => hh.settings?.currency || '₪'
const once = (k) => { if (state.jobs[k]) return false; state.jobs[k] = Date.now(); dirty = true; return true }

async function runWeekly(now) {
  await forEachHousehold(async (hid, hh) => {
    const txs = await loadTxs(hid)
    const w = weeklySummary(txs, hh, now)
    if (!w) return
    const cur = curOf(hh)
    let body = `הוצאתם ${fmt(w.total, cur)} השבוע (${w.count} הוצאות)`
    if (w.top) body += `. הכי הרבה: ${catName(w.top.id)} (${fmt(w.top.amount, cur)})`
    if (w.pace) body += `. ניצלתם ${w.pace.spentPct}% מהתקציב החודשי וחלף ${w.pace.monthPct}% מהחודש`
    await sendToUsers(membersOf(hid, hh), { title: 'סיכום שבועי', body, tag: 'weekly' }, 'summary')
  })
}

async function runMonthly(key) {
  await forEachHousehold(async (hid, hh) => {
    const m = monthlySummary(await loadTxs(hid), hh, key)
    if (!m) return
    const cur = curOf(hh)
    let body = `הוצאתם ${fmt(m.total, cur)}`
    if (m.changePct !== null) body += m.changePct === 0 ? ', כמו בחודש הקודם' : ` (${m.changePct > 0 ? 'עלייה' : 'ירידה'} של ${Math.abs(m.changePct)}% לעומת החודש הקודם)`
    if (m.top) body += `. הקטגוריה המובילה: ${catName(m.top.id)} (${fmt(m.top.amount, cur)})`
    if (m.diff !== null) body += m.diff >= 0 ? `. נשארתם ${fmt(m.diff, cur)} מתחת לתקציב` : `. חרגתם מהתקציב ב-${fmt(-m.diff, cur)}`
    await sendToUsers(membersOf(hid, hh), { title: `סיכום ${monthLabelHe(key)}`, body, tag: `monthly-${key}` }, 'summary')
  })
}

// Daily check (evening): mid-month pace and categories that jumped. Each is sent
// once per month (per category for jumps).
async function runDaily(now) {
  const key = monthKeyOf(now), day = now.getDate()
  await forEachHousehold(async (hid, hh) => {
    const txs = await loadTxs(hid)
    const cur = curOf(hh), to = membersOf(hid, hh)
    const p = paceWarning(txs, hh, key, day)
    if (p && once(`pace|${hid}|${key}`)) {
      await sendToUsers(to, {
        title: 'קצב הוצאות גבוה',
        body: `ב-${p.day} לחודש כבר ניצלתם ${p.pct}% מהתקציב (${fmt(p.spent, cur)} מתוך ${fmt(p.budget, cur)}). בקצב הזה תסיימו את החודש ב-${fmt(p.projected, cur)}.`,
        tag: 'pace',
      }, 'pace')
    }
    const fresh = categoryJumps(txs, key, day).filter(j => once(`jump|${hid}|${key}|${j.id}`)).slice(0, 2)
    if (fresh.length) {
      await sendToUsers(to, {
        title: 'קטגוריה שקפצה',
        body: fresh.map(j => `${catName(j.id)}: ${fmt(j.cur, cur)} עד עכשיו, לעומת ${fmt(j.prev, cur)} בתקופה המקבילה בחודש שעבר (עלייה של ${j.pct}%)`).join('. '),
        tag: 'jump',
      }, 'pace')
    }
  })
}

// ── recurring expenses: book occurrences whose date has arrived ──
// Same logic as the app (server/recurring.js is a copy of src/utils/recurring.js)
// and the same deterministic ids, so an app that opens at the same moment
// cannot create a duplicate.
async function runRecurring() {
  const snap = await db.collection('transactions').where('isRecurring', '==', true).get()
  const byHousehold = new Map()
  snap.docs.forEach(d => {
    const t = { id: d.id, ...d.data() }
    if (!t.householdId) return
    if (!byHousehold.has(t.householdId)) byHousehold.set(t.householdId, [])
    byHousehold.get(t.householdId).push(t)
  })
  let booked = 0
  for (const [hid, txs] of byHousehold) {
    try {
      const hh = (await db.doc(`households/${hid}`).get()).data() || {}
      if (hh.recurringOff) continue
      const due = getDueRecurring(txs, new Date(), { stopped: hh.recurringStopped || {}, skipped: hh.recurringSkipped || {} })
      const made = []
      for (const { id, data } of due) {
        try {
          announcedRecurring.add(id)            // before create: the listener must not announce it again
          await db.doc(`transactions/${id}`).create({ ...data, householdId: hid, createdAt: FieldValue.serverTimestamp() })
          booked++; made.push(data)
        } catch (e) { if (e.code !== 6) log('רישום הוצאה קבועה נכשל:', id, e.message) } // 6 = already exists
      }
      if (made.length) {
        const cur = hh.settings?.currency || '₪'
        const members = [...new Set([hid, ...(hh.members || [])])]
        const body = made.length === 1
          ? `${recurringLine(made[0], cur)} · ${catName(made[0].category)}`
          : `${made.length} הוצאות קבועות: ${made.slice(0, 3).map(m => recurringLine(m, cur)).join(', ')}${made.length > 3 ? ' ועוד' : ''}`
        await sendToUsers(members, { title: made.length === 1 ? 'הוצאה קבועה נרשמה' : 'הוצאות קבועות נרשמו', body, tag: `recurring-${hid}-${Date.now()}` }, 'recurring')
      }
    } catch (e) { log('הוצאות קבועות, משק בית', hid, e.message) }
  }
  if (booked) log(`נרשמו ${booked} הוצאות קבועות`)
}
let lastRecurring = 0

// ── supermarket prices: refreshed every morning, looked up when the app scans a barcode ──
const PRICE_KEYS = (process.env.PRICE_STORES || Object.keys(STORES).join(',')).split(',').map(x => x.trim()).filter(Boolean)
// branches to keep downloaded = everything any household picked (or the defaults for households that never picked)
let chosenKeys = new Set()
const wantedKeys = () => [...new Set([...PRICE_KEYS.filter(() => !chosenKeys.size), ...chosenKeys])]
const keysOfHousehold = (hh) => { const k = (hh.priceStores || []).filter(validKey); return k.length ? k : PRICE_KEYS }
function watchHouseholdBranches() {
  db.collection('households').onSnapshot(snap => {
    const set = new Set()
    snap.forEach(d => { const hh = d.data(); if (Array.isArray(hh.priceStores) && hh.priceStores.some(validKey)) hh.priceStores.filter(validKey).forEach(k => set.add(k)) })
    chosenKeys = set
  }, e => { log('האזנה לסניפים נפלה:', e.message); setTimeout(watchHouseholdBranches, 10000) })
}
let catalogBusy = false
async function runCatalog() {
  if (catalogBusy) return
  catalogBusy = true
  try {
    const stores = await refreshCatalog(DATA_DIR, log)
    await db.doc('priceCatalog/stores').set({ stores, updatedAt: FieldValue.serverTimestamp() })
  } finally { catalogBusy = false }
}
// prices are "fresh" when they were downloaded today (Israel time); the daily refresh starts after 06:00
const sameDay = (t) => new Date(t).toDateString() === new Date().toDateString()
const pricesStale = () => wantedKeys().some(k => { const d = loadStore(DATA_DIR, k); return !d || !sameDay(d.fetchedAt) })
// the "not updated today" warning in the app only after the morning refresh should already have happened
const pricesTooOld = () => wantedKeys().some(k => { const d = loadStore(DATA_DIR, k); return !d || Date.now() - d.fetchedAt > 36 * 3600 * 1000 })
let pricesRunning = false
async function runPrices() {
  if (pricesRunning) return
  pricesRunning = true
  try { await refreshAll(DATA_DIR, log, wantedKeys()); await warm(DATA_DIR, wantedKeys(), log) } finally { pricesRunning = false }
}

function watchPriceLookups() {
  db.collection('priceLookups').where('status', '==', 'pending').onSnapshot(snap => {
    snap.docChanges().forEach(async ch => {
      if (ch.type !== 'added') return
      const q = ch.doc.data()
      try {
        let keys = PRICE_KEYS
        if (q.householdId) keys = keysOfHousehold((await db.doc(`households/${q.householdId}`).get()).data() || {})
        if (q.type === 'search' || q.type === 'basket') {
          const have = keys.filter(k => loadStore(DATA_DIR, k))
          const base = { status: 'done', preparing: have.length < keys.length, branches: have.length, labels: Object.fromEntries(have.map(k => [k, loadStore(DATA_DIR, k).label])), answeredAt: FieldValue.serverTimestamp() }
          if (q.type === 'search') await ch.doc.ref.update({ ...base, products: searchProducts(DATA_DIR, String(q.q || '').slice(0, 60), have) })
          else await ch.doc.ref.update({ ...base, compare: compareBasket(DATA_DIR, (q.items || []).slice(0, 60).map(i => ({ code: String(i.code), qty: Math.max(1, Math.min(99, Number(i.qty) || 1)) })), have) })
          return
        }
        const results = lookup(DATA_DIR, q.barcode, keys)
        const preparing = keys.some(k => !loadStore(DATA_DIR, k))     // a newly picked branch is still downloading
        await ch.doc.ref.update({ status: 'done', results, preparing, answeredAt: FieldValue.serverTimestamp(), stale: pricesTooOld() })
      } catch (e) {
        if (e.code === 5) return            // the app already gave up and deleted the request
        log('חיפוש מחיר נכשל:', e.message)
        await ch.doc.ref.update({ status: 'error', error: e.message }).catch(() => {})
      }
    })
  }, e => { log('האזנה לחיפושי מחיר נפלה:', e.message); setTimeout(watchPriceLookups, 10000) })
  // old requests are not needed after a few minutes
  setInterval(async () => {
    const old = await db.collection('priceLookups').where('createdAt', '<', Timestamp.fromMillis(Date.now() - 10 * 60 * 1000)).get().catch(() => null)
    old?.docs.forEach(d => d.ref.delete().catch(() => {}))
  }, 5 * 60 * 1000)
  log('מאזין לחיפושי מחיר')
}

function tick() {
  if (!catalogBusy && catalogAge(DATA_DIR) > 7 * 24 * 3600 * 1000) runCatalog().catch(e => log('קטלוג סניפים נכשל:', e.message))
  if ((new Date().getHours() >= 6 || wantedKeys().some(k => !loadStore(DATA_DIR, k))) && pricesStale()) runPrices().catch(e => log('מחירים נכשלו:', e.message))
  if (Date.now() - lastRecurring > 60 * 60 * 1000) {
    lastRecurring = Date.now()
    runRecurring().catch(e => log('הוצאות קבועות נכשלו:', e.message))
  }
  const now = new Date()
  if (SKIP_SHABBAT && isShabbat(now)) return
  const h = now.getHours(), today = dayStr(now)
  if (now.getDay() === 0 && h >= 9 && h < 13 && once(`weekly|${today}`)) {
    runWeekly(now).catch(e => log('סיכום שבועי נכשל:', e.message))
  }
  if (now.getDate() <= 3 && h >= 9 && h < 20 && once(`monthly|${prevMonthKey(monthKeyOf(now))}`)) {
    runMonthly(prevMonthKey(monthKeyOf(now))).catch(e => log('סיכום חודשי נכשל:', e.message))
  }
  if (h >= 19 && h < 22 && once(`daily|${today}`)) {
    runDaily(now).catch(e => log('בדיקה יומית נכשלה:', e.message))
  }
}
setInterval(tick, 60000)
setTimeout(tick, 5000)

watchHouseholdBranches()
watchPriceLookups()
setTimeout(() => warm(DATA_DIR, wantedKeys(), log).catch(e => log('טעינת סניפים נכשלה:', e.message)), 5000)
watchTransactions()
watchTests()
log('השרת פועל. פרויקט:', admin.app().options.credential ? 'ok' : '?')
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { dirty = true; save(); process.exit(0) })

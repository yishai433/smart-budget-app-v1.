import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Instant on-device product search.
// The home server publishes a compact product index to Firestore (priceIndex/{householdId},
// split into base64 chunks under .../parts). The app downloads it once per version, caches it
// in IndexedDB, and searches it locally with no round-trip, so results appear as you type.

// ---- tiny IndexedDB cache (one store, keyed by household) ----
const DB = 'sb-price-index', STORE = 'idx'
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbGet(key) {
  try { const d = await idb(); return await new Promise((res) => { const t = d.transaction(STORE).objectStore(STORE).get(key); t.onsuccess = () => res(t.result); t.onerror = () => res(null) }) }
  catch { return null }
}
async function idbPut(key, val) {
  try { const d = await idb(); await new Promise((res) => { const t = d.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key); t.onsuccess = res; t.onerror = res }) }
  catch { /* private mode: skip cache */ }
}

const b64ToBytes = (b64) => { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out }

// Returns { v, keys, labels, items } or null when the server hasn't published one yet.
export async function loadPriceIndex(householdId) {
  const meta = (await getDoc(doc(db, 'priceIndex', householdId))).data()
  if (!meta || !meta.chunks) return null
  const cached = await idbGet(householdId)
  if (cached && cached.v === meta.v) return { v: meta.v, keys: meta.keys, labels: meta.labels, items: cached.items }

  const chunks = []
  for (let i = 0; i < meta.chunks; i++) {
    const d = (await getDoc(doc(db, 'priceIndex', householdId, 'parts', String(i)))).data()
    if (!d?.s) return null
    chunks.push(b64ToBytes(d.s))
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const all = new Uint8Array(total)
  let o = 0; for (const c of chunks) { all.set(c, o); o += c.length }
  const items = JSON.parse(new TextDecoder().decode(all))
  idbPut(householdId, { v: meta.v, items })
  return { v: meta.v, keys: meta.keys, labels: meta.labels, items }
}

// ---- search ----
const norm = (t) => String(t || '').toLowerCase().replace(/["'`׳״]/g, '').replace(/[-–_.,/()]/g, ' ').replace(/\s+/g, ' ').trim()

// Pre-tokenise once per loaded index (names don't change between keystrokes).
export function prepareIndex(index) {
  if (!index) return null
  const rows = index.items.map(([code, name, prices]) => {
    const toks = norm(name).split(' ')
    return { code, name, prices, toks, first: toks[0] || '', joined: toks.join(' ') }
  })
  return { keys: index.keys, labels: index.labels, rows }
}

// Tier: 0 = a name whose first word is the query's first word, 1 = query words appear as whole
// words anywhere, 2 = query appears only as part of longer words. Lower is better.
function tier(row, words) {
  if (words.every(w => row.toks.includes(w))) return row.first === words[0] ? 0 : 1
  return words.every(w => row.joined.includes(w)) ? 2 : 9
}

export function searchLocal(prepared, query, limit = 30) {
  if (!prepared) return null
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return []
  const t0 = [], t1 = [], t2 = []
  for (const row of prepared.rows) {
    const t = tier(row, words)
    if (t === 0) t0.push(row); else if (t === 1) t1.push(row); else if (t === 2) t2.push(row)
    if (t0.length >= limit) break                 // enough perfect matches: stop early
  }
  let pool = t0
  if (pool.length < 8) pool = pool.concat(t1)
  if (pool.length < 4) pool = pool.concat(t2)
  const keys = prepared.keys
  return pool
    .map(r => {
      const prices = {}
      let min = Infinity
      r.prices.forEach((p, i) => { if (p != null) { prices[keys[i]] = p; if (p < min) min = p } })
      return { code: r.code, name: r.name, prices, min, n: Object.keys(prices).length, _len: r.name.length }
    })
    .sort((a, b) => b.n - a.n || a._len - b._len || a.min - b.min)
    .slice(0, limit)
}

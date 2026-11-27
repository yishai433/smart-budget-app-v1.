// Supermarket prices for the barcode scanner.
// Source: the public price files that chains must publish (price transparency law).
//   shufersal: prices.shufersal.co.il         (public file list)
//   sapir:     supersapir.binaprojects.com    (Bina Projects JSON list + Download.aspx)
// Once a day the full price + promotion files of the chosen branches are downloaded and
// reduced to one small JSON per branch under DATA_DIR/prices/. lookup() reads those.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// ── branches we know ──
export const STORES = {
  'shufersal-190': { chain: 'shufersal', store: '190', label: 'שופרסל דיל חצור הגלילית' },
  'sapir-21': { chain: 'sapir', store: '21', label: 'סופר ספיר חצור' },
}

// any "<chain>-<storeId>" key is a branch; its label comes from the catalog when known
// chains published through Cerberus (url.publishedprices.co.il): the chain's own user name, empty password
export const CERBERUS = {
  osherad: { user: 'osherad', label: 'אושר עד' },
  ramilevi: { user: 'RamiLevi', label: 'רמי לוי' },
  yohananof: { user: 'yohananof', label: 'יוחננוף' },
  tivtaam: { user: 'TivTaam', label: 'טיב טעם' },
  freshmarket: { user: 'Freshmarket', label: 'פרשמרקט' },
  stopmarket: { user: 'Stop_Market', label: 'סטופ מרקט' },
  keshet: { user: 'Keshet', label: 'קשת טעמים' },
}
// chains on the laibcatalog.co.il "webapi" (Nibit engine), identified by the chain's EDI (company id):
//   getfiles?edi=..  → [{branchNumber,fileName,fileType,fileDate,fileSize}]
//   getbranches?edi=.. → [{number,name}]
//   download: webapi/<edi>/<fileName>  → gz
export const LAIB = {
  mshuk: { edi: '7290661400001', label: 'מחסני השוק' },
}
const KEY_RE = new RegExp(`^(shufersal|sapir|${[...Object.keys(CERBERUS), ...Object.keys(LAIB)].join('|')})-(\\d+)$`)
export const validKey = (k) => KEY_RE.test(String(k || ''))
let catalogCache = null
function storeDef(key, dataDir) {
  if (STORES[key]) return STORES[key]
  const m = KEY_RE.exec(key)
  if (!m) return null
  const hit = (catalogCache || (dataDir && loadCatalog(dataDir)) || []).find(x => x.k === key)
  return { chain: m[1], store: m[2], label: hit ? hit.n : key }
}

// ── XML helpers (the files are plain XML, sometimes UTF-16) ──
export function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le').replace(/^﻿/, '')
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf).swap16().toString('utf16le').replace(/^﻿/, '')
  return buf.toString('utf8').replace(/^﻿/, '')
}
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${name}>`, 'i'))
  return m ? m[1].trim() : ''
}
const blocks = (xml, name) => xml.match(new RegExp(`<${name}[ >][\\s\\S]*?</${name}>`, 'gi')) || []
const num = (s) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null }

export function parseItems(xml) {
  const out = {}
  for (const b of blocks(xml, 'Item')) {
    const code = tag(b, 'ItemCode'), price = num(tag(b, 'ItemPrice'))
    if (!code || price == null) continue
    out[code] = [tag(b, 'ItemName'), price, tag(b, 'UnitOfMeasure') || tag(b, 'UnitQty')]
  }
  return out
}

// promotions by barcode: [{ id, text, end, club, minQty, price, rate }]
export function parsePromos(xml, now = new Date()) {
  const out = {}
  for (const b of blocks(xml, 'Promotion')) {
    const end = tag(b, 'PromotionEndDateTime') || tag(b, 'PromotionEndDate')
    const start = tag(b, 'PromotionStartDateTime') || tag(b, 'PromotionStartDate')
    if (end && new Date(end) < now) continue
    if (start && new Date(start) > now) continue
    if (tag(b, 'AdditionalIsCoupon') === '1') continue          // coupons / gifts are not shelf prices
    const club = !/^0/.test(tag(b, 'ClubID') || '0')
    const minQty = num(tag(b, 'MinQty')) || num(tag(b, 'MinNoOfItemOffered'))
    for (const it of blocks(b, 'PromotionItem')) {
      const code = tag(it, 'ItemCode')
      if (!code) continue
      const price = num(tag(it, 'DiscountedPrice'))
      const rate = num(tag(it, 'DiscountRate'))
      ;(out[code] ||= []).push({
        id: tag(b, 'PromotionID'), text: tag(b, 'PromotionDescription'), end: end.slice(0, 10),
        club, minQty: num(tag(it, 'MinQty')) || minQty, price: price > 0 ? price : null, rate: rate > 0 ? rate : null,
      })
    }
  }
  return out
}

// ── downloading ──
async function getBuf(url) {
  let last
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 smart-budget' }, signal: AbortSignal.timeout(120000) })
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url.split('?')[0]}`)
      return Buffer.from(await r.arrayBuffer())
    } catch (e) {
      const c = e.cause ? ` (${e.cause.code || e.cause.message})` : ''
      last = new Error(`${e.message}${c} ${url.split('?')[0]}`)
      await new Promise(r => setTimeout(r, 2000 * (i + 1)))
    }
  }
  throw last
}
const gunzipText = (buf) => { try { return decodeText(zlib.gunzipSync(buf)) } catch { return decodeText(buf) } }
const stamp = (name) => (name.match(/-(\d{8})-(\d{6})\./) || []).slice(1).join('')   // 20261125030000

// ── Cerberus: log in (user name only), list the chain's files, download one ──
const CB = 'https://url.publishedprices.co.il'
const sessions = new Map()      // chain -> { cookie, at, files }
async function cbFetch(chain, path, opt = {}, cookie = '') {
  const r = await fetch(CB + path, { redirect: 'manual', signal: AbortSignal.timeout(120000), ...opt, headers: { 'user-agent': 'Mozilla/5.0 smart-budget', cookie, ...(opt.headers || {}) } })
  return r
}
const cookieOf = (jar, res) => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)) } return [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }
const metaToken = (html) => ((html.match(/<meta[^>]*name=["']csrftoken["'][^>]*>/i) || [''])[0].match(/content\s*=\s*["']([^"']+)["']/i) || [])[1]
async function cerberusSession(chain) {
  const old = sessions.get(chain)
  if (old && Date.now() - old.at < 20 * 60 * 1000) return old
  const jar = new Map()
  let r = await cbFetch(chain, '/login')
  let cookie = cookieOf(jar, r)
  const token = metaToken(await r.text())
  if (!token) throw new Error('Cerberus: אין אסימון בדף ההתחברות')
  r = await cbFetch(chain, '/login/user', { method: 'POST', body: new URLSearchParams({ username: CERBERUS[chain].user, password: '', csrftoken: token, r: '' }), headers: { 'content-type': 'application/x-www-form-urlencoded' } }, cookie)
  cookie = cookieOf(jar, r)
  if (r.status !== 302) throw new Error(`Cerberus: התחברות נכשלה (${r.status})`)
  r = await cbFetch(chain, '/file', {}, cookie)
  cookie = cookieOf(jar, r)
  const t2 = metaToken(await r.text()) || token
  r = await cbFetch(chain, '/file/json/dir', { method: 'POST', body: new URLSearchParams({ sEcho: '1', iColumns: '5', sColumns: ',,,,', iDisplayStart: '0', iDisplayLength: '100000', mDataProp_0: 'fname', sSearch: '', iSortingCols: '0', cd: '/', csrftoken: t2 }), headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrftoken': t2 } }, cookie)
  const rows = JSON.parse(await r.text()).aaData || []
  const files = rows.map(x => x.fname || x.name || x[0]).filter(Boolean).map(String)
  if (!files.length) throw new Error('Cerberus: רשימת קבצים ריקה')
  const sess = { cookie, at: Date.now(), files }
  sessions.set(chain, sess)
  return sess
}
const cerberusList = async (chain) => (await cerberusSession(chain)).files
async function cerberusDownload(chain, name) {
  const { cookie } = await cerberusSession(chain)
  let last
  for (let i = 0; i < 3; i++) {
    try {
      const r = await cbFetch(chain, '/file/d/' + encodeURIComponent(name), {}, cookie)
      if (!r.ok) throw new Error(`HTTP ${r.status} ${name}`)
      return Buffer.from(await r.arrayBuffer())
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 2000 * (i + 1))) }
  }
  throw last
}

const fetchers = {
  async shufersal(store) {
    const cats = { PriceFull: 2, PromoFull: 4 }
    const out = {}
    for (const [kind, cat] of Object.entries(cats)) {
      const html = (await getBuf(`https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=${cat}&storeId=${store}&sort=Time&sortdir=DESC&page=1`)).toString('utf8')
      const links = [...html.matchAll(/href="([^"]+)"/gi)].map(m => m[1].replace(/&amp;/g, '&')).filter(h => /blob\.core|\.gz/i.test(h))
      if (!links.length) throw new Error(`שופרסל: אין קובץ ${kind} לסניף ${store}`)
      const name = decodeURIComponent(links[0].split('?')[0].split('/').pop())
      out[kind] = { name, text: gunzipText(await getBuf(links[0])) }
    }
    return out
  },
  async cerberus(store, chain) {
    const out = {}
    const files = await cerberusList(chain)
    for (const kind of ['PriceFull', 'PromoFull']) {
      const mine = files.filter(n => n.startsWith(kind) && new RegExp(`-0*${Number(store)}-\\d{8}-`).test(n))
        .sort((a, b) => stamp(b).localeCompare(stamp(a)))
      if (!mine.length) throw new Error(`${CERBERUS[chain].label}: אין קובץ ${kind} לסניף ${store}`)
      out[kind] = { name: mine[0], text: gunzipText(await cerberusDownload(chain, mine[0])) }
    }
    return out
  },
  async sapir(store) {
    const base = 'https://supersapir.binaprojects.com'
    const parse = async (u) => JSON.parse((await getBuf(u)).toString('utf8'))
    let list = await parse(`${base}/MainIO_Hok.aspx?WStore=${store}&WDate=&WFileType=0`).catch(() => [])
    const mine = (l) => l.filter(f => new RegExp(`-0*${store}-\\d{8}-`).test(f.FileNm))
    if (!mine(list).length) list = await parse(`${base}/MainIO_Hok.aspx`)
    list = mine(list)
    const out = {}
    for (const kind of ['PriceFull', 'PromoFull']) {
      const files = list.filter(f => f.FileNm.toLowerCase().startsWith(kind.toLowerCase())).sort((a, b) => stamp(b.FileNm).localeCompare(stamp(a.FileNm)))
      if (!files.length) throw new Error(`ספיר: אין קובץ ${kind} לסניף ${store}`)
      const meta = await parse(`${base}/Download.aspx?FileNm=${encodeURIComponent(files[0].FileNm)}`)
      const url = meta[0]?.SPath
      if (!url) throw new Error('ספיר: אין קישור הורדה')
      out[kind] = { name: files[0].FileNm, text: gunzipText(await getBuf(url)) }
    }
    return out
  },
  async laib(store, chain) {
    const edi = LAIB[chain].edi
    const base = 'https://laibcatalog.co.il/webapi'
    const list = JSON.parse((await getBuf(`${base}/api/getfiles?edi=${edi}`)).toString('utf8'))
    const mine = list.filter(f => (f.branchNumber | 0) === Number(store))
    // Prefer the full snapshot when it exists; otherwise the plain price file (mshuk's "price" files are full catalogs).
    const pick = (types) => {
      for (const t of types) {
        const hit = mine.filter(f => String(f.fileType).toLowerCase() === t)
          .sort((a, b) => String(b.fileDate).localeCompare(String(a.fileDate)))
        if (hit.length) return hit[0]
      }
      return null
    }
    const priceF = pick(['pricefull', 'price'])
    if (!priceF) throw new Error(`${LAIB[chain].label}: אין קובץ מחירים לסניף ${store}`)
    const promoF = pick(['promofull', 'promo'])
    const dl = async (f) => gunzipText(await getBuf(`${base}/${encodeURIComponent(edi)}/${encodeURIComponent(f.fileName)}`))
    return {
      PriceFull: { name: priceF.fileName, text: await dl(priceF) },
      PromoFull: promoF ? { name: promoF.fileName, text: await dl(promoF) } : { name: '', text: '' },
    }
  },
}

// ── storage ──
const dirOf = (dataDir) => path.join(dataDir, 'prices')
const fileOf = (dataDir, key) => path.join(dirOf(dataDir), `${key}.json`)
const cache = new Map()

export async function refreshStore(dataDir, key, log = console.log) {
  const def = storeDef(key, dataDir)
  if (!def) throw new Error('סניף לא מוכר: ' + key)
  const files = def.chain in CERBERUS ? await fetchers.cerberus(def.store, def.chain)
    : def.chain in LAIB ? await fetchers.laib(def.store, def.chain)
    : await fetchers[def.chain](def.store)
  const items = parseItems(files.PriceFull.text)
  const promos = parsePromos(files.PromoFull.text)
  const data = { key, label: def.label, chain: def.chain, store: def.store, fetchedAt: Date.now(),
    files: { price: files.PriceFull.name, promo: files.PromoFull.name }, items, promos }
  fs.mkdirSync(dirOf(dataDir), { recursive: true })
  fs.writeFileSync(fileOf(dataDir, key), JSON.stringify(data))
  cache.set(key, data)
  log(`מחירים עודכנו: ${def.label} (${Object.keys(items).length} מוצרים, ${Object.keys(promos).length} עם מבצע)`)
  return data
}

export function loadStore(dataDir, key) {
  if (cache.has(key)) return cache.get(key)
  try { const d = JSON.parse(fs.readFileSync(fileOf(dataDir, key), 'utf8')); cache.set(key, d); return d } catch { return null }
}

const lastTry = new Map()
export async function refreshAll(dataDir, log = console.log, keys = Object.keys(STORES)) {
  for (const k of keys) {
    const d = loadStore(dataDir, k)
    if (d && new Date(d.fetchedAt).toDateString() === new Date().toDateString()) continue   // already downloaded today
    if (Date.now() - (lastTry.get(k) || 0) < 10 * 60 * 1000) continue       // failed recently: wait 10 min
    lastTry.set(k, Date.now())
    try { await refreshStore(dataDir, k, log) } catch (e) { log('עדכון מחירים נכשל:', k, e.message) }
  }
}

// barcodes may be stored without a leading zero (EAN-13 vs UPC) — try both
const variants = (c) => { const u = c.replace(/^0+/, ''); return [...new Set([c, u, u.padStart(12, '0'), u.padStart(13, '0'), u.padStart(14, '0')])] }

export function lookup(dataDir, barcode, keys = Object.keys(STORES), now = new Date()) {
  const code = String(barcode || '').replace(/\D/g, '')
  const results = []
  for (const key of keys) {
    const d = loadStore(dataDir, key)
    if (!d) continue
    const hit = variants(code).find(v => d.items[v])
    if (!hit) continue
    const [name, price, unit] = d.items[hit]
    results.push({
      key, chain: d.chain, label: d.label, name, price, unit,
      promos: (d.promos[hit] || []).slice(0, 3),
      asOf: d.fetchedAt,
    })
  }
  return results
}


// ── branch catalog: every branch we can read, for the "pick your branches by city" screen ──
const catFile = (dataDir) => path.join(dirOf(dataDir), 'catalog.json')
export function loadCatalog(dataDir) {
  if (catalogCache) return catalogCache
  try { catalogCache = JSON.parse(fs.readFileSync(catFile(dataDir), 'utf8')).stores; return catalogCache } catch { return null }
}
const CATALOG_V = 4     // bump to force every server to rebuild the branch list (new chains added)
export const catalogAge = (dataDir) => {
  try { if (JSON.parse(fs.readFileSync(catFile(dataDir), 'utf8')).v !== CATALOG_V) return Infinity; return Date.now() - fs.statSync(catFile(dataDir)).mtimeMs } catch { return Infinity }
}

export function parseStoreList(xml) {
  return blocks(xml, 'STORE').map(b => ({ id: tag(b, 'STOREID'), name: tag(b, 'STORENAME'), a: tag(b, 'ADDRESS'), city: tag(b, 'CITY') })).filter(x => x.id)
}

export async function refreshCatalog(dataDir, log = console.log) {
  const out = []
  try {
    const html = (await getBuf('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=5&storeId=0&sort=Time&sortdir=DESC&page=1')).toString('utf8')
    const link = [...html.matchAll(/href="([^"]+)"/gi)].map(m => m[1].replace(/&amp;/g, '&')).find(h => /blob\.core|\.gz/i.test(h))
    if (link) for (const x of parseStoreList(gunzipText(await getBuf(link)))) {
      const id = String(parseInt(x.id, 10))
      if (id !== 'NaN') out.push({ k: `shufersal-${id}`, c: 'shufersal', n: x.name, city: x.city, a: x.a })
    }
  } catch (e) { log('קטלוג שופרסל נכשל:', e.message) }
  try {
    const list = JSON.parse((await getBuf('https://supersapir.binaprojects.com/MainIO_Hok.aspx')).toString('utf8'))
    const seen = new Set()
    for (const f of list) {
      const m = /^\s*(\d+)\s*(.*)$/.exec(f.Store || '')
      if (!m || seen.has(m[1])) continue
      seen.add(m[1])
      out.push({ k: `sapir-${parseInt(m[1], 10)}`, c: 'sapir', n: `ספיר ${m[2].trim()}`.trim(), city: m[2].trim(), a: '' })
    }
  } catch (e) { log('קטלוג ספיר נכשל:', e.message) }
  for (const [chain, def] of Object.entries(CERBERUS)) {
    try {
      const files = await cerberusList(chain)
      const sf = files.filter(n => /^Stores/i.test(n)).sort((a, b) => stamp(b).localeCompare(stamp(a)) || b.localeCompare(a))[0]
      if (!sf) throw new Error('אין קובץ סניפים')
      const seen = new Set()
      for (const x of parseStoreList(gunzipText(await cerberusDownload(chain, sf)))) {
        const id = String(parseInt(x.id, 10))
        if (id === 'NaN' || seen.has(id)) continue
        seen.add(id)
        out.push({ k: `${chain}-${id}`, c: chain, n: x.name.includes(def.label) ? x.name : `${def.label} ${x.name}`.trim(), city: x.city, a: x.a })
      }
    } catch (e) { log(`קטלוג ${def.label} נכשל:`, e.message) }
  }
  for (const [chain, def] of Object.entries(LAIB)) {
    try {
      const branches = JSON.parse((await getBuf(`https://laibcatalog.co.il/webapi/api/getbranches?edi=${def.edi}`)).toString('utf8'))
      const seen = new Set()
      for (const b of branches) {
        const id = String(parseInt(b.number ?? b.Number, 10))
        if (id === 'NaN' || seen.has(id)) continue
        seen.add(id)
        const raw = String(b.name ?? b.Name ?? '').replace(/^\d+\s*/, '').trim()   // names come as "268 נהריה..."
        out.push({ k: `${chain}-${id}`, c: chain, n: raw.includes(def.label) ? raw : `${def.label} ${raw}`.trim(), city: raw, a: '' })
      }
    } catch (e) { log(`קטלוג ${def.label} נכשל:`, e.message) }
  }
  if (!out.length) throw new Error('לא נמצאו סניפים')
  fs.mkdirSync(dirOf(dataDir), { recursive: true })
  fs.writeFileSync(catFile(dataDir), JSON.stringify({ stores: out, at: Date.now(), v: CATALOG_V }))
  catalogCache = out
  log(`קטלוג סניפים עודכן: ${out.length} סניפים`)
  return out
}


// ── product search by name + basket comparison across the chosen branches ──
const norm = (t) => String(t || '').toLowerCase().replace(/["'`׳״]/g, '').replace(/[-–_.,/()]/g, ' ').replace(/\s+/g, ' ').trim()
const unzero = (c) => String(c).replace(/^0+/, '')
const normCache = new WeakMap()
function normIndex(d) {
  let idx = normCache.get(d)
  if (!idx) { idx = Object.entries(d.items).map(([code, v]) => [code, norm(v[0])]); normCache.set(d, idx) }
  return idx
}
const findItem = (d, code) => { const v = variants(String(code)).find(x => d.items[x]); return v ? d.items[v] : null }

// Relevance: 0 = the name STARTS with the searched word(s) ("חלב 3%" for "חלב"),
// 1 = the word is a whole word elsewhere in the name ("ריבת חלב"), 2 = only part of a longer word ("חלבון").
function tierOf(name, words) {
  const toks = norm(name).split(' ')
  if (!words.every(w => toks.includes(w))) return words.every(w => norm(name).includes(w)) ? 2 : 9
  return toks[0] === words[0] ? 0 : 1
}

export function searchProducts(dataDir, query, keys, limit = 25) {
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return []
  const found = new Map()      // unzero(code) -> { code, name, prices: {key: price}, tier }
  for (const key of keys) {
    const d = loadStore(dataDir, key)
    if (!d) continue
    for (const [code, n] of normIndex(d)) {
      if (!words.every(w => n.includes(w))) continue
      const u = unzero(code)
      const name = d.items[code][0]
      let row = found.get(u)
      if (!row) { row = { code: u, name, unit: d.items[code][2] || '', prices: {}, tier: 9 }; found.set(u, row) }
      row.tier = Math.min(row.tier, tierOf(name, words))
      row.prices[key] = d.items[code][1]
    }
  }
  const rows = [...found.values()].map(r => ({ ...r, n: Object.keys(r.prices).length, min: Math.min(...Object.values(r.prices)) }))
  // start with the best matches; only reach for weaker ones when there are too few
  const t0 = rows.filter(r => r.tier === 0), t1 = rows.filter(r => r.tier === 1), t2 = rows.filter(r => r.tier === 2)
  let pool = t0
  if (pool.length < 6) pool = pool.concat(t1)
  if (pool.length < 3) pool = pool.concat(t2)
  return pool
    .sort((a, b) => a.tier - b.tier || b.n - a.n || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ code, name, unit, prices, min }) => ({ code, name, unit, prices, min }))
}

// items: [{ code, qty }] -> one total per branch, plus what that branch is missing
export function compareBasket(dataDir, items, keys) {
  const out = []
  for (const key of keys) {
    const d = loadStore(dataDir, key)
    if (!d) continue
    let total = 0
    const prices = {}, missing = []
    for (const it of items) {
      const hit = findItem(d, it.code)
      if (!hit) { missing.push(it.code); continue }
      prices[it.code] = hit[1]
      total += hit[1] * (it.qty || 1)
    }
    out.push({ key, chain: d.chain, label: d.label, total: Math.round(total * 100) / 100, found: items.length - missing.length, missing, prices })
  }
  return out
}

// load the chosen branches into memory (and build their search index) in the background, one at a time,
// so the first search after a restart doesn't have to wait for it
export async function warm(dataDir, keys, log = console.log) {
  const t = Date.now()
  for (const k of keys) {
    const d = loadStore(dataDir, k)
    if (d) normIndex(d)
    await new Promise(r => setImmediate(r))
  }
  log(`סניפים נטענו לזיכרון: ${keys.length} (${Date.now() - t}ms)`)
}


// A compact product index for instant on-device search. Shape:
//   { keys: ['shufersal-190', ...], items: [[code, name, [price|null per key]], ...] }
// Deduped by barcode (leading zeros stripped); the shortest name across branches is kept.
export function buildIndex(dataDir, keys) {
  const map = new Map()
  keys.forEach((key, ki) => {
    const d = loadStore(dataDir, key)
    if (!d) return
    for (const [code, v] of Object.entries(d.items)) {
      const u = unzero(code)
      let row = map.get(u)
      if (!row) { row = [u, v[0], new Array(keys.length).fill(null)]; map.set(u, row) }
      row[2][ki] = v[1]
      if (v[0] && v[0].length < row[1].length) row[1] = v[0]
    }
  })
  return { keys, items: [...map.values()] }
}

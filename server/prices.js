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
}

// ── storage ──
const dirOf = (dataDir) => path.join(dataDir, 'prices')
const fileOf = (dataDir, key) => path.join(dirOf(dataDir), `${key}.json`)
const cache = new Map()

export async function refreshStore(dataDir, key, log = console.log) {
  const def = STORES[key]
  if (!def) throw new Error('סניף לא מוכר: ' + key)
  const files = await fetchers[def.chain](def.store)
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
    if (d && Date.now() - d.fetchedAt < 26 * 3600 * 1000) continue          // already fresh
    if (Date.now() - (lastTry.get(k) || 0) < 10 * 60 * 1000) continue       // failed recently: wait 10 min
    lastTry.set(k, Date.now())
    try { await refreshStore(dataDir, k, log) } catch (e) { log('עדכון מחירים נכשל:', k, e.message) }
  }
}

// barcodes may be stored without a leading zero (EAN-13 vs UPC) — try both
const variants = (c) => [...new Set([c, c.replace(/^0+/, ''), c.padStart(13, '0')])]

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

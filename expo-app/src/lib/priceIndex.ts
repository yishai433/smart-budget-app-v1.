import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '../firebase'

// Supermarket prices for the household's chosen branches.
// The home server refreshes the chains' public price files every morning and publishes a compact
// product index to Firestore (priceIndex/{householdId}, base64 chunks under .../parts) — the same
// one the website uses. We download it once per version, keep it on the phone, and search it
// locally so prices appear as you type, with no waiting.

export interface PriceRow { code: string; name: string; prices: (number | null)[]; toks: string[]; first: string; joined: string }
export interface PriceIndex { v: string; keys: string[]; labels: Record<string, string>; rows: PriceRow[]; byCode: Map<string, PriceRow>; updatedAt: number | null }
export interface ProductHit { code: string; name: string; price: number | null; min: number; branches: number; variant: boolean; exact: boolean }

// ---- decoding (manual, so it works the same on every JS engine) ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const LOOKUP = (() => { const t = new Uint8Array(256); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t })()
function b64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let o = 0
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)], b = LOOKUP[clean.charCodeAt(i + 1)]
    const c = LOOKUP[clean.charCodeAt(i + 2)], d = LOOKUP[clean.charCodeAt(i + 3)]
    out[o++] = (a << 2) | (b >> 4)
    if (i + 2 < clean.length) out[o++] = ((b & 15) << 4) | (c >> 2)
    if (i + 3 < clean.length) out[o++] = ((c & 3) << 6) | d
  }
  return out.subarray(0, o)
}
function utf8(bytes: Uint8Array): string {
  let s = '', chunk: number[] = []
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i++]
    let cp = b
    if (b >= 0xf0) cp = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
    else if (b >= 0xe0) cp = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
    else if (b >= 0xc0) cp = ((b & 31) << 6) | (bytes[i++] & 63)
    if (cp > 0xffff) { cp -= 0x10000; chunk.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023)) } else chunk.push(cp)
    if (chunk.length > 8000) { s += String.fromCharCode(...chunk); chunk = [] }
  }
  return s + String.fromCharCode(...chunk)
}

// ---- search (same ranking as the website) ----
const norm = (t: string) => String(t || '').toLowerCase().replace(/["'`׳״]/g, '').replace(/[-–_.,/()]/g, ' ').replace(/\s+/g, ' ').trim()
const VARIANT = /(^| )(ב?מלח|ב?חומץ|ב?סוכר|ב?ציר|ב?שמן|כבוש\S*|חמוץ|חמוצ\S*|משומר\S*|מעושן|מיובש\S*|מרוכז\S*|קפוא\S*|מוקפא\S*|מרק|סלט|ממרח|תחליף|טעם|בטעם|אבקת|אבקה|רסק|ריבת|ריבה|שימורי|שימורים)( |$)/

function prepare(v: string, keys: string[], labels: Record<string, string>, items: [string, string, (number | null)[]][], updatedAt: number | null): PriceIndex {
  const rows = items.map(([code, name, prices]) => { const toks = norm(name).split(' '); return { code, name, prices, toks, first: toks[0] || '', joined: toks.join(' ') } })
  return { v, keys, labels, rows, byCode: new Map(rows.map(r => [r.code, r])), updatedAt }
}

function tier(row: PriceRow, words: string[]) {
  if (words.every(w => row.toks.includes(w))) return row.first === words[0] ? 0 : 1
  return words.every(w => row.joined.includes(w)) ? 2 : 9
}

// Products matching the query; `price` is the price at `store` (null if that branch doesn't sell it).
// Products sold at the chosen branch come first.
export function searchProducts(idx: PriceIndex | null, query: string, store: string, limit = 8): ProductHit[] {
  if (!idx) return []
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return []
  const si = idx.keys.indexOf(store)
  const t0: PriceRow[] = [], t1: PriceRow[] = [], t2: PriceRow[] = []
  for (const r of idx.rows) { const t = tier(r, words); if (t === 0) t0.push(r); else if (t === 1) t1.push(r); else if (t === 2) t2.push(r) }
  let pool = t0
  if (pool.length < 8) pool = pool.concat(t1)
  if (pool.length < 4) pool = pool.concat(t2)
  return pool.map(r => {
    const t = tier(r, words)
    const ps = r.prices.filter((p): p is number => p != null)
    const price = si >= 0 ? r.prices[si] ?? null : null
    const extra = r.toks.filter(t => !words.includes(t)).length
    const g = VARIANT.test(r.joined) && !words.some(w => VARIANT.test(w)) ? 2 : extra <= 2 ? 0 : 1
    return { code: r.code, name: r.name, variant: g === 2, exact: t === 0, price, min: ps.length ? Math.min(...ps) : Infinity, branches: ps.length, _g: g, _t: t, _s: price == null ? 1 : 0 }
  })
    .sort((a, b) => a._s - b._s || a._t - b._t || a._g - b._g || (a.price ?? a.min) - (b.price ?? b.min) || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ _g, _t, _s, ...h }) => h)
}

export function priceAt(idx: PriceIndex | null, code: string | undefined, store: string): number | null {
  if (!idx || !code) return null
  const r = idx.byCode.get(code); const si = idx.keys.indexOf(store)
  return r && si >= 0 ? r.prices[si] ?? null : null
}

// ---- loading, with an on-phone cache and one shared copy for the whole app ----
type State = { idx: PriceIndex | null; status: 'loading' | 'ready' | 'none' | 'error' }
let state: State = { idx: null, status: 'loading' }
let loadedFor = ''
let loading: Promise<void> | null = null
const subs = new Set<(s: State) => void>()
const set = (s: State) => { state = s; subs.forEach(f => f(s)) }

async function load(hh: string, force = false) {
  try {
    const meta = (await getDoc(doc(db, 'priceIndex', hh))).data() as { v?: string; chunks?: number; keys?: string[]; labels?: Record<string, string>; updatedAt?: { toMillis: () => number } } | undefined
    if (!meta?.chunks || !meta.keys) { set({ idx: null, status: 'none' }); return }
    const updatedAt = meta.updatedAt?.toMillis ? meta.updatedAt.toMillis() : null
    if (!force && state.idx?.v === meta.v) { set({ idx: { ...state.idx, keys: meta.keys, labels: meta.labels || {}, updatedAt }, status: 'ready' }); return }
    const cacheKey = `sb-price-index-${hh}`
    try {
      const raw = await AsyncStorage.getItem(cacheKey)
      if (raw) {
        const c = JSON.parse(raw) as { v: string; items: [string, string, (number | null)[]][] }
        if (c.v === meta.v) { set({ idx: prepare(c.v, meta.keys, meta.labels || {}, c.items, updatedAt), status: 'ready' }); return }
      }
    } catch { /* cache unreadable: download */ }
    const parts: string[] = []
    for (let i = 0; i < meta.chunks; i++) {
      const p = (await getDoc(doc(db, 'priceIndex', hh, 'parts', String(i)))).data() as { s?: string } | undefined
      if (!p?.s) { set({ idx: null, status: 'error' }); return }
      parts.push(p.s)
    }
    const chunks = parts.map(b64ToBytes)
    const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
    let o = 0; for (const c of chunks) { all.set(c, o); o += c.length }
    const json = utf8(all)
    const items = JSON.parse(json)
    set({ idx: prepare(meta.v || '', meta.keys, meta.labels || {}, items, updatedAt), status: 'ready' })
    AsyncStorage.setItem(cacheKey, JSON.stringify({ v: meta.v, items })).catch(() => {})
  } catch { set({ idx: state.idx, status: state.idx ? 'ready' : 'error' }) }
}

export function refreshPriceIndex(hh: string | null) {
  if (!hh || loading) return
  loadedFor = hh
  loading = load(hh, false).finally(() => { loading = null })
}

export function usePriceIndex(hh: string | null): State {
  const [s, setS] = useState(state)
  useEffect(() => {
    subs.add(setS)
    if (hh && loadedFor !== hh && !loading) refreshPriceIndex(hh)
    return () => { subs.delete(setS) }
  }, [hh])
  return s
}

// Best automatic match for a plain word like "milk": the cheapest regular (non-processed)
// product sold at the chosen branch among the closest name matches.
export function autoMatch(idx: PriceIndex | null, query: string, store: string): ProductHit | null {
  const hits = searchProducts(idx, query, store, 25).filter(h => h.price != null && !h.variant && h.exact)
  if (!hits.length) return null
  return hits.reduce((a, b) => ((b.price as number) < (a.price as number) ? b : a))
}

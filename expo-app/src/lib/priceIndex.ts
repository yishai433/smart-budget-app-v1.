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
export interface ProductHit { code: string; name: string; price: number | null; min: number; branches: number; cheapKey: string | null; variant: boolean; exact: boolean; bought?: boolean; basic?: boolean }

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

// Size / unit words ("1 ליטר", "500 גרם", "3%") describe the pack, not a different product,
// so they don't make a name "more specific".
const UNIT = /^(\d+([.,]\d+)?%?|\d+%|ליטר|ל|מל|גרם|גר|ג|קג|קילו|יח|יחידות|יחי|מארז|במארז|x\d+|\d+x)$/

// The everyday version of common staples, so "milk" puts plain 3% milk first, "eggs" a tray of L, etc.
// Checked against the normalised product name.
const STAPLES: [RegExp, RegExp][] = [
  [/^חלב$/, /^חלב( \S+){0,4} (3|1)%/],
  [/^ביצים$/, /^ביצים .*(\bl\b|גודל l|12)/],
  [/^לחם$/, /^לחם (אחיד|לבן|כפרי|חיטה מלאה|מלא)/],
  [/^קוטג$/, /^קוטג( \S+){0,3} (5|3)%/],
  [/^גבינה$/, /^גבינה לבנה( \S+){0,3} (5|3)%/],
  [/^גבינה לבנה$/, /^גבינה לבנה( \S+){0,3} (5|3)%/],
  [/^גבינה צהובה$/, /^גבינה צהובה (עמק|גלבוע|28%|פרוסות)/],
  [/^יוגורט$/, /^יוגורט (טבעי|3%|1 5%)/],
  [/^שמנת$/, /^שמנת (חמוצה|מתוקה)/],
  [/^חמאה$/, /^חמאה (תנובה|82%)/],
  [/^אורז$/, /^אורז (פרסי|לבן|בסמטי|עגול)/],
  [/^סוכר$/, /^סוכר (לבן )?(1|ק)/],
  [/^קמח$/, /^קמח (לבן|חיטה|תופח)/],
  [/^שמן$/, /^שמן (קנולה|חמניות|סויה|זית)/],
  [/^פסטה$/, /^(פסטה )?(ספגטי|פנה|פוזילי)/],
  [/^טונה$/, /^טונה (בשמן|במים|לייט)/],
  [/^מים$/, /^מים מינרליים/],
  [/^עוף$/, /^(חזה עוף|שניצל עוף|עוף שלם|כרעיים)/],
  [/^נייר טואלט$/, /^נייר טואלט/],
]

// Brand names don't make a product less basic ("תנובה 3% milk" is still plain milk).
const BRAND = new Set(['תנובה', 'טרה', 'שטראוס', 'יטבתה', 'הרדוף', 'שופרסל', 'ספיר', 'סנו', 'אסם', 'עלית', 'יכין', 'סוגת', 'וילי', 'פוד', 'מעדנות', 'זוגלובק', 'עוף', 'טוב', 'מאמא', 'עוף טוב', 'אנג׳ל', 'אנגל', 'ברמן', 'דנונה', 'גד', 'מחלבות', 'פרי', 'הגליל', 'נביעות', 'מי', 'עדן', 'קלאסי', 'טרי', 'בקרטון', 'בשקית', 'בבקבוק', 'קרטון', 'שקית', 'בקבוק'])
// Alternatives that people usually ask for by name (soy milk, goat cheese...).
const ALT = /(^| )(סויה|שקדים|שיבולת|עיזים|כבשים|קוקוס|צמחי|טבעוני|ללא גלוטן|דל|דיאט|לייט|זירו)( |$)/

export interface SearchOpts { limit?: number; prefer?: Set<string> }

// Products matching the query, best first: things this household bought before, then the plain
// everyday product (short name that starts with the word, not pickled / flavoured / processed),
// then everything else. `price` is the price at `store` (null if that branch doesn't sell it).
export function searchProducts(idx: PriceIndex | null, query: string, store: string, opts: SearchOpts | number = {}): ProductHit[] {
  const { limit = 40, prefer } = typeof opts === 'number' ? { limit: opts, prefer: undefined } : opts
  if (!idx) return []
  const q = norm(query)
  const words = q.split(' ').filter(Boolean)
  if (!words.length) return []
  const staple = STAPLES.find(([k]) => k.test(q))?.[1]
  const si = idx.keys.indexOf(store)
  const scored: (ProductHit & { _k: number })[] = []
  for (const r of idx.rows) {
    const t = tier(r, words)
    if (t === 9) continue
    const ps = r.prices.filter((p): p is number => p != null)
    const price = si >= 0 ? r.prices[si] ?? null : null
    // which of the household's branches sells it cheapest (ties go to the chosen branch)
    let ci = -1
    r.prices.forEach((p, i) => { if (p != null && (ci < 0 || p < (r.prices[ci] as number) || (p === r.prices[ci] && i === si))) ci = i })
    const extra = r.toks.filter(w => !words.includes(w) && !UNIT.test(w) && !BRAND.has(w)).length
    const alt = ALT.test(r.joined) && !words.some(w => ALT.test(w))
    const variant = VARIANT.test(r.joined) && !words.some(w => VARIANT.test(w))
    let k = t * 100 + (variant ? 60 : 0) + (alt ? 35 : 0) + Math.min(extra, 8) * 7 + (price == null ? 400 : 0)
    if (staple && staple.test(r.joined)) k -= 45
    if (prefer?.has(r.code)) k -= 250
    scored.push({ code: r.code, name: r.name, variant, exact: t === 0, price, min: ps.length ? Math.min(...ps) : Infinity, branches: ps.length, cheapKey: ci >= 0 ? idx.keys[ci] : null, bought: !!prefer?.has(r.code), basic: !!staple && staple.test(r.joined), _k: k })
  }
  return scored
    .sort((a, b) => a._k - b._k || b.branches - a.branches || (a.price ?? a.min) - (b.price ?? b.min) || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ _k, ...h }) => h)
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

// Best automatic match for a plain word like "milk": the top-ranked everyday product that the
// chosen branch sells (something bought before wins, then the basic version).
export function autoMatch(idx: PriceIndex | null, query: string, store: string, prefer?: Set<string>): ProductHit | null {
  return searchProducts(idx, query, store, { limit: 10, prefer }).find(h => h.price != null && !h.variant && h.exact) || null
}

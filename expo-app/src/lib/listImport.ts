import type { PriceIndex } from './priceIndex'

// ---- reading a pasted / uploaded shopping list ----
// Handles plain lines ("חלב", "2 חלב", "חלב x2", "חלב - 3 יח'"), bullets / numbering / check
// boxes, comma-separated lists on one line, CSV / spreadsheet rows (name + quantity columns),
// and barcodes anywhere in a line (used to find the exact product).

export interface ParsedLine { name: string; qty: number; code?: string }

// words that make a number part of the product, not a quantity ("1 ליטר", "500 גרם", "3%")
const UNIT_AFTER = /^(%|ל(יטר)?['׳]?|ליטר|מ"?ל|מל|ג(רם)?['׳]?|גרם|ק"?ג|קג|קילו|מ"?ג|יח(ידות)?['׳]?|פריטים|שקית|שקיות|זוגות|מטר|cm|ml|l|g|kg|גלילים|כביסות|קפסולות)/i
const QTY_WORD = /^(יח(ידות|'|׳)?|יחידה|פעמים|x|×)$/i

const clean = (s: string) => s
  .replace(/^\s*(?:[-–—*•·●▪◦>]+|\[[ xX✓]?\]|☐|☑|✓|✔|\d{1,2}[.)])\s*/, '')   // bullets, "1." / "1)", check boxes
  .replace(/\s+/g, ' ').trim()

function parseOne(raw: string): ParsedLine | null {
  let s = clean(raw)
  if (!s || s.endsWith(':') || s.length > 80) return null
  let qty = 1, code: string | undefined
  // a barcode anywhere (7–14 digits)
  const bc = s.match(/(?:^|\s)(\d{7,14})(?=\s|$)/)
  if (bc) { code = bc[1]; s = s.replace(bc[1], ' ').replace(/\s+/g, ' ').trim() }
  // trailing "x2" / "×2" / "*2" / "- 2" / "2 יח'"
  let m = s.match(/\s*(?:[x×X*]\s*(\d{1,2})|[-–:]\s*(\d{1,2})(?:\s*(?:יח(?:ידות)?['׳]?|יחידה))?|(\d{1,2})\s*(?:יח(?:ידות)?['׳]?|יחידה|פעמים))\s*$/)
  if (m) { qty = Number(m[1] || m[2] || m[3]); s = s.slice(0, m.index).trim() }
  else {
    // leading "2 חלב" / "2x חלב" (but "1 ליטר חלב" keeps its number)
    m = s.match(/^(\d{1,2})\s*[x×X*]?\s+(.+)$/)
    if (m && !UNIT_AFTER.test(m[2])) { qty = Number(m[1]); s = m[2] }
  }
  s = s.replace(/[\s,;.\-–]+$/, '').trim()
  if (!s && !code) return null
  if (s && !/[֐-׿a-zA-Z]/.test(s) && !code) return null
  return { name: s, qty: Math.max(1, Math.min(99, qty || 1)), code }
}

// one CSV / tab row: the cell with the most letters is the name, a small whole number is the quantity
function parseRow(cells: string[]): ParsedLine | null {
  const cs = cells.map(c => c.replace(/^"|"$/g, '').trim()).filter(Boolean)
  if (!cs.length) return null
  const letters = (c: string) => (c.match(/[֐-׿a-zA-Z]/g) || []).length
  const name = [...cs].sort((a, b) => letters(b) - letters(a))[0]
  if (!letters(name)) return null
  const code = cs.find(c => /^\d{7,14}$/.test(c))
  const q = cs.find(c => c !== name && /^\d{1,2}(\.0+)?$/.test(c))
  const p = parseOne(name)
  if (!p) return null
  return { name: p.name, qty: q ? Math.max(1, Math.min(99, Number(q))) : p.qty, code: code || p.code }
}

export function parseList(text: string): ParsedLine[] {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  const tabular = lines.length > 1 && lines.filter(l => /\t|,.*,/.test(l)).length >= lines.length * 0.6
  const out: ParsedLine[] = []
  for (const l of lines) {
    if (tabular) { const r = parseRow(l.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/)); if (r) out.push(r); continue }
    // one line with commas: "חלב, לחם, ביצים"
    const parts = !tabular && lines.length <= 3 && l.split(/[,،;]/).length > 1 ? l.split(/[,،;]/) : [l]
    for (const part of parts) { const r = parseOne(part); if (r) out.push(r) }
  }
  // the header of a spreadsheet ("שם מוצר, כמות") is not a product
  if (tabular && out.length > 1 && /^(שם|מוצר|פריט|תיאור|name|item|product)/i.test(out[0].name) && !out[0].code) out.shift()
  // same product twice → add the quantities
  const by = new Map<string, ParsedLine>()
  for (const r of out) {
    const k = r.code || r.name
    const had = by.get(k)
    if (had) had.qty = Math.min(99, had.qty + r.qty); else by.set(k, { ...r })
  }
  return [...by.values()].slice(0, 150)
}

// ---- the cheapest basket ----
export interface BasketLine { code?: string; qty: number; name: string }
export interface BranchTotal {
  key: string; total: number; found: number; missing: string[]; estimated: number
}
export interface BasketResult { branches: BranchTotal[]; split: number; splitFound: number; priced: number; lines: number }

// For every branch in the index: what the list costs there. A product a branch doesn't carry is
// estimated at its average price elsewhere (so totals stay comparable) and listed as missing.
// `split` is the total when every product is bought wherever it's cheapest.
export function compareBasket(idx: PriceIndex | null, lines: BasketLine[]): BasketResult {
  const empty = { branches: [], split: 0, splitFound: 0, priced: 0, lines: lines.length }
  if (!idx || !idx.keys.length) return empty
  const rows = lines.map(l => ({ l, r: l.code ? idx.byCode.get(l.code.replace(/^0+/, '')) : undefined })).filter(x => x.r && x.r.prices.some(p => p != null))
  if (!rows.length) return empty
  let split = 0
  for (const { l, r } of rows) split += Math.min(...(r!.prices.filter(p => p != null) as number[])) * l.qty
  const branches = idx.keys.map((key, i) => {
    let total = 0, found = 0, estimated = 0
    const missing: string[] = []
    for (const { l, r } of rows) {
      const p = r!.prices[i]
      if (p != null) { total += p * l.qty; found++ }
      else {
        const ps = r!.prices.filter(x => x != null) as number[]
        const avg = ps.reduce((a, b) => a + b, 0) / ps.length
        total += avg * l.qty; estimated += avg * l.qty; missing.push(l.name)
      }
    }
    return { key, total: Math.round(total * 100) / 100, found, missing, estimated: Math.round(estimated * 100) / 100 }
  }).filter(b => b.found > 0)
    // a branch that has almost nothing from the list isn't a real option
    .filter(b => b.found >= Math.ceil(rows.length * 0.5))
    .sort((a, b) => a.total - b.total)
  return { branches, split: Math.round(split * 100) / 100, splitFound: rows.length, priced: rows.length, lines: lines.length }
}

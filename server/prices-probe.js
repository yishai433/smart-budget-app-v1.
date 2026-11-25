// Price-file probe (step 1 of barcode prices). Run it on the home server:
//   node prices-probe.js [city] [barcode]
// It checks, for Shufersal, whether the public price files can be downloaded and
// whether they hold what the app needs: barcodes, names, prices and promotions.
// It only reads public files and writes nothing.
import zlib from 'node:zlib'

const BASE = 'https://prices.shufersal.co.il/FileObject/UpdateCategory'
const CITY = process.argv[2] || 'חצור'
const BARCODE = process.argv[3] || ''
const CAT = { Price: 1, PriceFull: 2, Promo: 3, PromoFull: 4, Stores: 5 }
const log = (...a) => console.log(...a)

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

export const parseStores = (xml) => blocks(xml, 'STORE').map(b => ({
  id: tag(b, 'STOREID'), name: tag(b, 'STORENAME'), address: tag(b, 'ADDRESS'), city: tag(b, 'CITY'),
}))
export const parseItems = (xml) => blocks(xml, 'Item').map(b => ({
  code: tag(b, 'ItemCode'), name: tag(b, 'ItemName'), price: parseFloat(tag(b, 'ItemPrice')),
  unit: tag(b, 'UnitOfMeasure') || tag(b, 'UnitQty'), updated: tag(b, 'PriceUpdateDate'),
}))
export const parsePromos = (xml) => blocks(xml, 'Promotion').map(b => ({
  id: tag(b, 'PromotionId'), text: tag(b, 'PromotionDescription'), end: tag(b, 'PromotionEndDate'),
  clubOnly: tag(b, 'Clubs') !== '' || /1/.test(tag(b, 'ClubId')),
  items: blocks(b, 'Item').map(i => tag(i, 'ItemCode')),
  price: parseFloat(tag(b, 'DiscountedPrice')) || null,
}))

async function listFiles(kind, store = 0) {
  const url = `${BASE}?catID=${CAT[kind]}&storeId=${store}&sort=Time&sortdir=DESC&page=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${kind}: HTTP ${res.status}`)
  const html = await res.text()
  const links = [...html.matchAll(/href="([^"]+)"/gi)].map(m => m[1].replace(/&amp;/g, '&')).filter(h => /\.(gz|xml|zip)/i.test(h) || /blob\.core/i.test(h))
  return links
}
async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`הורדה נכשלה: HTTP ${res.status}`)
  const raw = Buffer.from(await res.arrayBuffer())
  let buf = raw
  try { buf = zlib.gunzipSync(raw) } catch { /* maybe plain xml */ }
  return { text: decodeText(buf), bytes: raw.length }
}
const fileNameOf = (u) => decodeURIComponent((u.split('?')[0].split('/').pop()) || u)

async function main() {
  log(`בודק את קבצי שופרסל, עיר: ${CITY}\n`)
  const storeLinks = await listFiles('Stores')
  log(`קבצי סניפים שנמצאו: ${storeLinks.length}`)
  if (!storeLinks.length) { log('לא נמצאו קישורים. כנראה האתר השתנה, שלח לי את ההודעה הזו.'); return }
  const stores = parseStores((await download(storeLinks[0])).text)
  log(`סניפים בקובץ: ${stores.length}`)
  const mine = stores.filter(s => s.city.includes(CITY) || s.address.includes(CITY) || s.name.includes(CITY))
  if (!mine.length) { log(`לא נמצא סניף ב"${CITY}". דוגמאות לערים בקובץ:`, [...new Set(stores.map(s => s.city))].slice(0, 15).join(', ')); return }
  mine.forEach(s => log(`  סניף ${s.id}: ${s.name} | ${s.address} | ${s.city}`))
  const store = mine[0].id

  for (const kind of ['PriceFull', 'PromoFull']) {
    const links = await listFiles(kind, store)
    log(`\n${kind}: ${links.length} קבצים לסניף ${store}`)
    if (!links.length) continue
    log('  הקובץ האחרון:', fileNameOf(links[0]))
    if (links[1]) log('  הקודם לו:    ', fileNameOf(links[1]))
    const { text, bytes } = await download(links[0])
    log(`  גודל מוקטן: ${(bytes / 1024).toFixed(0)}KB, מורחב: ${(text.length / 1024 / 1024).toFixed(1)}MB`)
    if (kind === 'PriceFull') {
      const items = parseItems(text)
      log(`  מוצרים: ${items.length}`)
      items.slice(0, 3).forEach(i => log(`   ${i.code} | ${i.name} | ₪${i.price}`))
      if (BARCODE) { const f = items.find(i => i.code === BARCODE); log(f ? `  נמצא ${BARCODE}: ${f.name} ₪${f.price}` : `  הברקוד ${BARCODE} לא נמצא בסניף`) }
    } else {
      const promos = parsePromos(text)
      log(`  מבצעים: ${promos.length}`)
      promos.slice(0, 3).forEach(p => log(`   ${p.text} | עד ${p.end} | מוצרים: ${p.items.length}${p.price ? ' | ₪' + p.price : ''}`))
    }
  }
  log('\nסיימתי. הדבק לי את כל הפלט.')
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('נכשל:', e.message); process.exit(1) })

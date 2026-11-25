// Probe 3: Super Sapir (Bina Projects) file site — find the Hatzor branch, see how files are
// requested and downloaded.   node prices-probe3.js [city]
import zlib from 'node:zlib'
import { decodeText } from './prices-probe.js'

const CITY = process.argv[2] || 'חצור'
const base = 'https://supersapir.binaprojects.com'
const show = (t, s, n = 1500) => console.log(`\n===== ${t} =====\n${String(s).slice(0, n)}`)
const get = async (p) => {
  const r = await fetch(p.startsWith('http') ? p : `${base}/${p}`)
  return { status: r.status, ct: r.headers.get('content-type') || '', buf: Buffer.from(await r.arrayBuffer()) }
}
const text = (r) => r.buf.toString('utf8')

async function main() {
  const js = text(await get('JS/script.js'))
  const i = js.indexOf('MainIO_Hok')
  show('script.js around MainIO_Hok', js.slice(Math.max(0, i - 600), i + 900), 1600)
  const d = js.indexOf('Download.aspx')
  show('script.js around Download.aspx', js.slice(Math.max(0, d - 500), d + 700), 1200)

  for (const p of ['Select_Store.aspx', 'Select_Reshet.aspx']) {
    const r = await get(p)
    show(`${p} ${r.status} ${r.ct}`, text(r), 700)
    const hits = text(r).split(/[{}]/).filter(x => x.includes(CITY))
    show(`${p}: entries that mention ${CITY}`, hits.join('\n') || 'none', 1500)
  }

  const all = JSON.parse(text(await get('MainIO_Hok.aspx')))
  console.log(`\nקבצים ברשימה: ${all.length}; סוגים: ${[...new Set(all.map(f => f.TypeFile))].join(', ')}`)
  console.log('רשתות:', [...new Set(all.map(f => f.Reshet.trim()))].join(' | '))
  const mine = all.filter(f => f.Store.includes(CITY))
  show(`קבצים של סניפים שמכילים ${CITY}`, mine.map(f => `${f.FileNm} | ${f.Store.trim()} | ${f.TypeFile} | ${f.DateFile}`).join('\n') || 'none', 2500)

  const pick = mine.find(f => /^PriceFull/i.test(f.FileNm)) || all.find(f => /^PriceFull/i.test(f.FileNm)) || mine[0] || all[0]
  if (pick) {
    const r = await get(`Download.aspx?FileNm=${encodeURIComponent(pick.FileNm)}`)
    show(`Download ${pick.FileNm}: ${r.status} ${r.ct} (${r.buf.length} bytes)`, r.ct.includes('json') || r.buf[0] === 0x5b || r.buf[0] === 0x7b ? text(r) : '(לא טקסט)', 800)
    try {
      const x = decodeText(zlib.gunzipSync(r.buf))
      show('הקובץ אחרי פתיחה', x, 800)
    } catch { /* maybe JSON with a link */ }
  }
  console.log('\nסיימתי. הדבק לי את כל הפלט.')
}
main().catch(e => { console.error('נכשל:', e.message); process.exit(1) })

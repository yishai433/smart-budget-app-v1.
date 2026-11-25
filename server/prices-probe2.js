// Probe 2: (a) show one raw promotion block from Shufersal so the promo parser can be
// matched to the real format, (b) look at how Super Sapir's file site (Bina Projects) lists files.
//   node prices-probe2.js
import zlib from 'node:zlib'
import { decodeText } from './prices-probe.js'

const show = (title, s, n = 1500) => console.log(`\n===== ${title} =====\n${String(s).slice(0, n)}`)
const get = async (url, opts) => {
  const r = await fetch(url, opts)
  const ct = r.headers.get('content-type') || ''
  return { status: r.status, ct, buf: Buffer.from(await r.arrayBuffer()), headers: r.headers }
}

async function shufersalPromo() {
  const list = await get('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=4&storeId=190&sort=Time&sortdir=DESC&page=1')
  const html = list.buf.toString('utf8')
  const link = [...html.matchAll(/href="([^"]+)"/gi)].map(m => m[1].replace(/&amp;/g, '&')).find(h => /blob\.core|\.gz/i.test(h))
  const f = await get(link)
  const xml = decodeText(zlib.gunzipSync(f.buf))
  show('Shufersal: XML head', xml, 600)
  const blocks = xml.match(/<Promotion[ >][\s\S]*?<\/Promotion>/gi) || []
  show('Shufersal: first promotion block', blocks[0] || 'none')
  const withItems = blocks.find(b => /ItemCode/i.test(b))
  show('Shufersal: a promotion that has ItemCode', withItems || 'none found')
}

async function sapir() {
  const base = 'https://supersapir.binaprojects.com'
  const main = await get(`${base}/Main.aspx`)
  const html = main.buf.toString('utf8')
  show('Sapir Main.aspx: status/type', `${main.status} ${main.ct} (${html.length} chars)`, 200)
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m => m[1])
  show('Sapir: script files', scripts.join('\n'), 800)
  const inline = [...html.matchAll(/(?:url|\.ajax|fetch|\.aspx)[^\n]{0,160}/gi)].map(m => m[0]).slice(0, 25)
  show('Sapir: lines that mention url/ajax/.aspx', inline.join('\n'), 2500)
  for (const p of ['MainIO_Hok.aspx', 'MainIO_Hok.aspx?WStore=&WDate=&WFileType=0', 'Main.aspx?WFileType=4']) {
    try {
      const r = await get(`${base}/${p}`)
      show(`Sapir ${p}: ${r.status} ${r.ct}`, r.buf.toString('utf8'), 1200)
    } catch (e) { show(`Sapir ${p}`, 'failed: ' + e.message) }
  }
}

for (const [name, fn] of [['shufersal', shufersalPromo], ['sapir', sapir]]) {
  try { await fn() } catch (e) { console.log(`\n!! ${name} failed: ${e.message}`) }
}
console.log('\nסיימתי. הדבק לי את כל הפלט.')

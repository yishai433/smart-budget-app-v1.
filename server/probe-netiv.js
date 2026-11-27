// Investigate the נתיב החסד portal (app.netiv-hesed.com), which also serves ברכלטוב (בר-כל)
// and שירה מרקט under the same site. It's a plain HTML table (not Cerberus, not an API) with a
// direct download link per file: /Prices/Download?fileName=<name>.
// This script: (1) finds and downloads the "Stores" master file, (2) gunzips it and prints the
// raw XML so we can see which fields identify the sub-chain (נתיב החסד vs ברכלטוב vs שירה מרקט).
//
//     node probe-netiv.js

import zlib from 'node:zlib'

const BASE = 'https://app.netiv-hesed.com'

function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le').replace(/^﻿/, '')
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf).swap16().toString('utf16le').replace(/^﻿/, '')
  return buf.toString('utf8').replace(/^﻿/, '')
}
const gunzipText = (buf) => { try { return decodeText(zlib.gunzipSync(buf)) } catch { return decodeText(buf) } }

async function getBuf(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'user-agent': 'Mozilla/5.0 smart-budget' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return Buffer.from(await r.arrayBuffer())
}

async function main() {
  try {
    console.log('== מחפש את קובץ הסניפים (Stores) ==')
    const html = (await getBuf(`${BASE}/?FileType=Stores`)).toString('utf8')
    const m = html.match(/file-name">([^<]+)<\/td>\s*<td>\s*<a[^>]*href="([^"]+)"/)
    if (!m) { console.log('לא נמצא קובץ Stores בעמוד. מדפיס קטע מהעמוד:'); console.log(html.slice(0, 3000)); return }
    const [, fileName, href] = m
    console.log(`קובץ: ${fileName}`)
    console.log(`קישור: ${href}`)
    const url = href.startsWith('http') ? href : `${BASE}${href}`
    const buf = await getBuf(url)
    const xml = gunzipText(buf)
    console.log(`\n== הקובץ אחרי פתיחה (gzip): ${xml.length} תווים ==`)
    console.log(xml.slice(0, 6000))

    // try to spot sub-chain / chain markers per store block
    const stores = xml.match(/<STORE[ >][\s\S]*?<\/STORE>/gi) || xml.match(/<Store[ >][\s\S]*?<\/Store>/gi) || []
    console.log(`\nנמצאו ${stores.length} בלוקי חנות.`)
    if (stores.length) {
      console.log('\n3 דוגמאות ראשונות:')
      stores.slice(0, 3).forEach(s => console.log(s + '\n---'))
    }
  } catch (e) {
    console.log('שגיאה: ' + e.message)
  }
}
main()

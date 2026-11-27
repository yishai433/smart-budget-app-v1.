// One-off probe for the laibcatalog.co.il price portal (Matrix/Nibit engine), used by
// מחסני השוק and others. It inspects how the chain's file list is exposed and how a file
// is downloaded, so we can add a proper fetcher. Reachable only from an Israeli IP, so it
// runs on the home server.
//
// Run on the server, from the server/ folder:
//     node probe-laib.js            # defaults to the מחסני השוק path (mshuk)
//     node probe-laib.js <chainPath>   # e.g. node probe-laib.js barkol
//
// Send me the whole output.

const CHAIN = process.argv[2] || 'mshuk'
const BASE = `https://laibcatalog.co.il/${CHAIN}`

async function get(url, opt = {}) {
  const r = await fetch(url, {
    redirect: 'follow', signal: AbortSignal.timeout(60000),
    headers: { 'user-agent': 'Mozilla/5.0 smart-budget-probe', ...(opt.headers || {}) },
    ...opt,
  })
  const text = await r.text().catch(() => '')
  return { status: r.status, ct: r.headers.get('content-type') || '', text, url }
}

const uniq = (a) => [...new Set(a)]
const show = (label, arr, n = 20) => {
  console.log(`\n${label} (${arr.length}):`)
  uniq(arr).slice(0, n).forEach(x => console.log('   ' + x))
}

async function inspect(url) {
  console.log(`\n==== GET ${url} ====`)
  let r
  try { r = await get(url) } catch (e) { console.log('שגיאה: ' + e.message); return null }
  console.log(`status ${r.status} · ${r.ct} · ${r.text.length} תווים`)
  const html = r.text
  const hrefs = (html.match(/href\s*=\s*["']([^"']+)["']/gi) || []).map(s => s.replace(/^href\s*=\s*["']|["']$/gi, ''))
  const srcs = (html.match(/src\s*=\s*["']([^"']+)["']/gi) || []).map(s => s.replace(/^src\s*=\s*["']|["']$/gi, ''))
  const gz = (html.match(/[\w\-./%]+\.gz\b/gi) || [])
  const aspx = (html.match(/[\w\-./%]+\.aspx\b/gi) || [])
  const prices = (html.match(/\b(PriceFull|Price|StoresFull|Stores|PromoFull|Promo)[\w\-]*\.(gz|xml)\b/gi) || [])
  const scripts = srcs.filter(s => /\.js(\?|$)/i.test(s))
  show('קישורים (href)', hrefs)
  show('סקריפטים (src .js)', scripts)
  show('אזכורי .aspx', aspx)
  show('אזכורי .gz', gz)
  show('שמות קובצי מחיר/חנויות', prices)
  if (!hrefs.length && !gz.length && !aspx.length) {
    console.log('\n--- אין קישורים בדף; 1500 התווים הראשונים של ה-HTML: ---')
    console.log(html.slice(0, 1500))
  }
  return { html, hrefs, srcs, gz, aspx }
}

async function main() {
  console.log(`בודק את הפורטל של '${CHAIN}' ב- ${BASE}`)
  // 1) the page the user saw
  await inspect(`${BASE}/index.html`)
  // 2) the folder root (often an Apache listing of .gz files, or a loader)
  await inspect(`${BASE}/`)
  // 3) common Matrix/Nibit listing endpoints — see which one answers with JSON/files
  for (const ep of ['MainIO_Hok.aspx', 'Main.aspx', 'file.aspx', 'NBCompanyFileList.aspx', 'ajax/get_files.aspx']) {
    try {
      const r = await get(`${BASE}/${ep}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'iDisplayLength=10&sEcho=1' })
      const sample = r.text.slice(0, 300).replace(/\s+/g, ' ')
      console.log(`\n[endpoint] ${ep} → ${r.status} · ${r.ct} · ${r.text.length} תווים · דוגמה: ${sample}`)
    } catch (e) { console.log(`\n[endpoint] ${ep} → שגיאה: ${e.message}`) }
  }
  console.log('\nסיום. שלח לי את כל הפלט מכאן ומעלה.')
}

main()

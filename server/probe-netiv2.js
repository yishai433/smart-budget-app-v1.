// Step 2: check that filtering the netiv-hesed file table by BranchTypeNumber (sub-chain) +
// StoreNumber returns exactly the PriceFull/PromoFull rows for one branch of בר-כל (SubChainID 002).
//
//     node probe-netiv2.js            # store 001 (רחובות פרץ ברכל) by default
//     node probe-netiv2.js 016        # אלעד

const BASE = 'https://app.netiv-hesed.com'
const SUBCHAIN = '002'   // בר-כל
const store = (process.argv[2] || '001').padStart(3, '0')

async function getText(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'user-agent': 'Mozilla/5.0 smart-budget' } })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return r.text()
}

function parseRows(html) {
  const rows = html.match(/<tr>\s*<td>[\s\S]*?<\/tr>/g) || []
  return rows.map(row => {
    const type = (row.match(/badge-(\w+)/) || [])[1] || ''
    const fileName = (row.match(/class="file-name">([^<]+)</) || [])[1] || ''
    const href = (row.match(/href="([^"]+)"/) || [])[1] || ''
    return { type, fileName, href }
  }).filter(r => r.fileName)
}

async function tryUrl(url) {
  console.log('== ' + url + ' ==')
  const html = await getText(url)
  const summary = (html.match(/summary-total">([^<]+)</) || [])[1]
  console.log('סיכום: ' + summary)
  const rows = parseRows(html)
  console.log(`נמצאו ${rows.length} שורות קבצים:`)
  rows.slice(0, 15).forEach(r => console.log(`  [${r.type}] ${r.fileName}  ->  ${r.href}`))
  console.log()
}

async function main() {
  try {
    await tryUrl(`${BASE}/?BranchTypeNumber=${SUBCHAIN}&StoreNumber=${store}`)
    await tryUrl(`${BASE}/?Search=${SUBCHAIN}-${store}`)
    await tryUrl(`${BASE}/?Search=${store}`)
    await tryUrl(`${BASE}/?FileType=PriceFull`)
  } catch (e) {
    console.log('שגיאה: ' + e.message)
  }
}
main()

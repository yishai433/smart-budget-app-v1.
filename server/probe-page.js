// Print the full body of a URL (reachable only from an Israeli IP, so it runs on the
// home server). Used to read the inline JavaScript of price portals and find the real
// data endpoints.
//
//     node probe-page.js <url>
// e.g. node probe-page.js https://laibcatalog.co.il/mshuk/index.html

const url = process.argv[2]
if (!url) { console.log('שימוש: node probe-page.js <url>'); process.exit(1) }

async function main() {
  try {
    const r = await fetch(url, {
      redirect: 'follow', signal: AbortSignal.timeout(60000),
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'accept': 'text/html,application/json,*/*',
      },
    })
    const text = await r.text()
    console.log(`URL: ${r.url}`)
    console.log(`status ${r.status} · ${r.headers.get('content-type') || ''} · ${text.length} תווים`)
    console.log('================ BODY START ================')
    console.log(text.slice(0, 20000))
    console.log('================ BODY END ================')
    if (text.length > 20000) console.log(`(נחתך; יש עוד ${text.length - 20000} תווים)`)
  } catch (e) {
    console.log('שגיאה: ' + e.message)
  }
}
main()

// One-off probe: find the publishedprices.co.il (Cerberus) login name of a chain.
// Each chain logs in with its own username and an EMPTY password, then its price files
// are listed. This tries a set of candidate usernames and prints which one works, so we
// can add the chain to the app with the exact, confirmed name.
//
// Run on the home server (needs an Israeli IP), from the server/ folder:
//     node probe-store.js
// You can also pass your own candidates:
//     node probe-store.js Mahsani BarKol something_else
//
// For every username it prints OK (with how many files and one sample file name) or why
// it failed. 'osherad' is included as a known-good check that the script itself works.

const CB = 'https://url.publishedprices.co.il'

// Candidates to try. 'osherad' is a known working chain (sanity check). The rest are
// guesses for מחסני השוק (Mahsani Ashuk) and בר-כל (Bar-Kol); the probe tells us which is real.
const DEFAULT_CANDIDATES = [
  'osherad', // known good — proves the script works
  // מחסני השוק
  'Mahsani', 'mahsani', 'MahsaniAshuk', 'MahsaniHashuk', 'mahsani_ashuk', 'HaShook', 'Hashook', 'SuperMahsani', 'mahsaneihashuk', 'MahsaneiHashuk',
  // בר-כל
  'BarKol', 'Barkol', 'barkol', 'bar_kol', 'Bar-Kol', 'BarKolStores',
]

const cookieOf = (jar, res) => {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [kv] = c.split(';'); const i = kv.indexOf('=')
    if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1))
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
}
const metaToken = (html) =>
  ((html.match(/<meta[^>]*name=["']csrftoken["'][^>]*>/i) || [''])[0].match(/content\s*=\s*["']([^"']+)["']/i) || [])[1]

async function cb(path, opt = {}, cookie = '') {
  return fetch(CB + path, {
    redirect: 'manual', signal: AbortSignal.timeout(60000), ...opt,
    headers: { 'user-agent': 'Mozilla/5.0 smart-budget-probe', cookie, ...(opt.headers || {}) },
  })
}

async function probe(user) {
  const jar = new Map()
  let r = await cb('/login')
  let cookie = cookieOf(jar, r)
  const token = metaToken(await r.text())
  if (!token) return { ok: false, why: 'no token on login page' }
  r = await cb('/login/user', {
    method: 'POST',
    body: new URLSearchParams({ username: user, password: '', csrftoken: token, r: '' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  }, cookie)
  cookie = cookieOf(jar, r)
  if (r.status !== 302) return { ok: false, why: `login returned ${r.status} (wrong username)` }
  r = await cb('/file', {}, cookie)
  cookie = cookieOf(jar, r)
  const t2 = metaToken(await r.text()) || token
  r = await cb('/file/json/dir', {
    method: 'POST',
    body: new URLSearchParams({ sEcho: '1', iColumns: '5', sColumns: ',,,,', iDisplayStart: '0', iDisplayLength: '100000', mDataProp_0: 'fname', sSearch: '', iSortingCols: '0', cd: '/', csrftoken: t2 }),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrftoken': t2 },
  }, cookie)
  let rows
  try { rows = (JSON.parse(await r.text()).aaData) || [] } catch { return { ok: false, why: 'could not read file list' } }
  const files = rows.map(x => x.fname || x.name || x[0]).filter(Boolean).map(String)
  if (!files.length) return { ok: false, why: 'logged in but no files' }
  const sample = files.find(f => /price/i.test(f)) || files[0]
  return { ok: true, count: files.length, sample }
}

async function main() {
  const cands = process.argv.slice(2)
  const list = cands.length ? cands : DEFAULT_CANDIDATES
  console.log(`בודק ${list.length} שמות משתמש מול ${CB}\n`)
  const good = []
  for (const u of list) {
    try {
      const res = await probe(u)
      if (res.ok) { console.log(`✅  ${u}  — ${res.count} קבצים · דוגמה: ${res.sample}`); good.push(u) }
      else console.log(`❌  ${u}  — ${res.why}`)
    } catch (e) {
      console.log(`⚠️   ${u}  — שגיאת רשת: ${e.message}`)
    }
  }
  console.log('')
  if (good.length) console.log(`שמות שעבדו: ${good.join(', ')}\n(שלח לי את השורות עם ה-✅, כולל שם הקובץ לדוגמה)`)
  else console.log('אף שם לא עבד. שלח לי את כל הפלט ואנסה מועמדים אחרים.')
}

main()

// Probe: can we log in to Cerberus (url.publishedprices.co.il) and list files?
//   docker run --rm -v "$PWD":/p -w /p node:20-alpine node cerberus-probe.js
// Prints what each chain's login returns. Nothing is saved.
const BASE = 'https://url.publishedprices.co.il'
const USERS = (process.argv[2] || 'osherad,RamiLevi,yohananof,TivTaam,HaziHinam,Keshet,doralon,Victory,politzer').split(',')
const UA = { 'user-agent': 'Mozilla/5.0 smart-budget' }
const log = (...a) => console.log(...a)

const jar = () => {
  const m = new Map()
  return {
    add(res) { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); m.set(kv.slice(0, i), kv.slice(i + 1)) } },
    header() { return [...m].map(([k, v]) => `${k}=${v}`).join('; ') },
  }
}

async function tryUser(user) {
  const j = jar()
  const get = async (path, opt = {}) => {
    const r = await fetch(BASE + path, { redirect: 'manual', ...opt, headers: { ...UA, cookie: j.header(), ...(opt.headers || {}) } })
    j.add(r); return r
  }
  const page = await get('/login')
  const html = await page.text()
  const token = (html.match(/name="csrftoken"[^>]*value="([^"]+)"/) || html.match(/value="([^"]+)"[^>]*name="csrftoken"/) || [])[1]
  log(`\n=== ${user} ===  login page ${page.status}, csrf token: ${token ? 'found' : 'MISSING'}`)
  if (!token) { log(html.slice(0, 300)); return }
  const body = new URLSearchParams({ username: user, password: '', csrftoken: token, r: '' })
  const login = await get('/login/user', { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  log(`login POST: ${login.status} -> ${login.headers.get('location') || '(no redirect)'}`)
  const list = await get('/file/json/dir', {
    method: 'POST',
    body: new URLSearchParams({ sEcho: '1', iColumns: '5', sColumns: ',,,,', iDisplayStart: '0', iDisplayLength: '100000', mDataProp_0: 'fname', sSearch: '', iSortingCols: '0', cd: '/', csrftoken: token }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
  const text = await list.text()
  log(`file list: ${list.status}, ${text.length} bytes`)
  try {
    const rows = JSON.parse(text).aaData || []
    log(`files: ${rows.length}`)
    const names = rows.map(r => r.fname || r.name || r[0]).filter(Boolean)
    const kinds = {}
    names.forEach(n => { const k = String(n).replace(/[-_.].*$/, ''); kinds[k] = (kinds[k] || 0) + 1 })
    log('by type:', JSON.stringify(kinds))
    log('examples:', names.slice(0, 3).join(' | '))
    const stores = names.filter(n => /^Stores/i.test(n)).sort().pop()
    log('newest Stores file:', stores || '(none)')
  } catch { log(text.slice(0, 300)) }
}

for (const u of USERS) { try { await tryUser(u) } catch (e) { log(`${u}: ${e.message}`) } }

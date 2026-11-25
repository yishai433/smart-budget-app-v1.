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
  // the token may be a form field or a <meta> tag, in either attribute order
  const tags = html.match(/<(input|meta|form)\b[^>]*>/gi) || []
  const tokenTag = tags.find(t => /csrf|token/i.test(t))
  const token = tokenTag && (tokenTag.match(/(?:value|content)\s*=\s*["']([^"']+)["']/i) || [])[1]
  log(`\n=== ${user} ===  login page ${page.status}, csrf token: ${token ? 'found' : 'MISSING'}`)
  if (!token || process.argv[3] === 'debug') { log('form fields on the page:'); tags.filter(t => !/viewport|charset|http-equiv/i.test(t)).forEach(t => log('  ' + t.replace(/\s+/g, ' ').slice(0, 200))) }
  if (!token) return
  const tokenName = ((tokenTag.match(/(?:name|id)\s*=\s*["']([^"']+)["']/i) || [])[1]) || 'csrftoken'
  const body = new URLSearchParams({ username: user, password: '', [tokenName]: token, r: '' })
  const login = await get('/login/user', { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  log(`login POST: ${login.status} -> ${login.headers.get('location') || '(no redirect)'}`)
  // after login the site hands out a fresh token on the files page
  const filePage = await (await get('/file')).text()
  const t2 = ((filePage.match(/<meta[^>]*name=["']csrftoken["'][^>]*>/i) || [''])[0].match(/content\s*=\s*["']([^"']+)["']/i) || [])[1] || token
  log(`files page token: ${t2 === token ? 'same as before' : 'new'}`)
  const list = await get('/file/json/dir', {
    method: 'POST',
    body: new URLSearchParams({ sEcho: '1', iColumns: '5', sColumns: ',,,,', iDisplayStart: '0', iDisplayLength: '100000', mDataProp_0: 'fname', sSearch: '', iSortingCols: '0', cd: '/', csrftoken: t2 }),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrftoken': t2 },
  })
  const text = await list.text()
  log(`file list: ${list.status}, ${text.length} bytes`)
  try {
    const rows = JSON.parse(text).aaData || []
    log(`files: ${rows.length}`)
    if (!rows.length) log('raw answer:', text)
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

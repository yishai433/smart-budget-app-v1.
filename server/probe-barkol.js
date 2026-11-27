// Verify the new בר-כל (netiv-hesed) downloader end-to-end, on the home server.
// Downloads and parses one real branch, prints how many products were read and a few samples.
//
//     node probe-barkol.js            # branch 001 (רחובות פרץ ברכל) by default
//     node probe-barkol.js 16          # אלעד, or any branch number from the Stores list
//
// It writes to a throwaway /tmp folder and does NOT touch the running price server.

import { refreshStore } from './prices.js'

const store = process.argv[2] || '1'
const key = `barkol-${store}`
const dir = '/tmp/barkol-probe'

async function main() {
  try {
    const d = await refreshStore(dir, key, console.log)
    const n = Object.keys(d.items).length
    console.log(`\nנקראו ${n} מוצרים מסניף ${store}.`)
    if (n > 0) {
      console.log('\nדוגמאות:')
      Object.entries(d.items).slice(0, 6).forEach(([code, v]) => console.log(`   ${code}  ${v[0]}  =  ${v[1]} ₪`))
      const milk = Object.entries(d.items).find(([, v]) => /חלב/.test(v[0]))
      if (milk) console.log(`\nדוגמת חלב: ${milk[1][0]} = ${milk[1][1]} ₪`)
    }
    console.log(n > 1000 ? '\n✅ נראה מצוין — הקובץ הוא קטלוג מלא.' : '\n⚠️ מעט מוצרים — ייתכן שזה קובץ חלקי ולא מלא. שלח לי את הפלט.')
  } catch (e) {
    console.log('❌ נכשל: ' + e.message)
    console.log('שלח לי את כל הפלט.')
  }
}
main()

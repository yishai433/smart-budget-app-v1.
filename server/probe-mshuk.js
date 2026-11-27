// Verify the new מחסני השוק (laibcatalog) downloader end-to-end, on the home server.
// Downloads and parses one real branch, prints how many products were read and a few samples.
//
//     node probe-mshuk.js            # branch 268 (נהריה) by default
//     node probe-mshuk.js 65         # קרית אתא, or any branch number from the list
//
// It writes to a throwaway /tmp folder and does NOT touch the running price server.

import { refreshStore, lookup } from './prices.js'

const store = process.argv[2] || '268'
const key = `mshuk-${store}`
const dir = '/tmp/mshuk-probe'

async function main() {
  try {
    const d = await refreshStore(dir, key, console.log)
    const n = Object.keys(d.items).length
    console.log(`\nנקראו ${n} מוצרים מסניף ${store}.`)
    if (n > 0) {
      console.log('\nדוגמאות:')
      Object.entries(d.items).slice(0, 6).forEach(([code, v]) => console.log(`   ${code}  ${v[0]}  =  ${v[1]} ₪`))
      // find something that looks like milk, to sanity check names
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

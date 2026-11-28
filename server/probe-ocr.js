// Try the receipt OCR on a local image file and print what it read.
//   node probe-ocr.js /path/to/receipt.jpg
// First run downloads the Hebrew language data (a few MB) into ./data, so give it a moment.
import fs from 'node:fs'
import { ocrReceipt, closeReceipt } from './receipt.js'

const file = process.argv[2]
if (!file || !fs.existsSync(file)) { console.log('שימוש: node probe-ocr.js <נתיב-לתמונה>'); process.exit(1) }

const t0 = Date.now()
try {
  const text = await ocrReceipt(fs.readFileSync(file), './data', console.log)
  console.log(`\n===== טקסט שזוהה (${Date.now() - t0}ms) =====\n`)
  console.log(text || '(ריק)')
  console.log('\n===== סוף =====')
  console.log(`${text.split('\n').filter(l => l.trim()).length} שורות, ${text.length} תווים`)
} catch (e) {
  console.log('נכשל:', e.message)
} finally {
  await closeReceipt()
}

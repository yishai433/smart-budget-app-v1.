// Receipt OCR utilities — image preprocessing + text parsing for Israeli receipts.
// Preprocessing is the single biggest lever for Tesseract accuracy on photos:
// grayscale → contrast stretch → Otsu binarization turns a noisy photo into
// clean black-on-white text.

// Known Israeli retail chains — detected by substring match, far more reliable
// than trusting raw OCR of the (often stylized) logo line.
const KNOWN_MERCHANTS = [
  'שופרסל', 'רמי לוי', 'ויקטורי', 'יוחננוף', 'אושר עד', 'מגה', 'טיב טעם',
  'יינות ביתן', 'חצי חינם', 'סופר פארם', 'סטופ מרקט', 'מחסני השוק',
  'אושר', 'קואופ', 'am:pm', 'טיב', 'ויקטורי',
  'מקדונלדס', "מקדונלד'ס", 'ארומה', 'קפה גרג', 'גולדה', 'קפה קפה', 'רולדין',
  'BIG', 'ביג', 'איקאה', 'IKEA', 'ZARA', 'קסטרו', 'פוקס', 'H&M', 'גולף',
  'דלק', 'פז', 'סונול', 'דור אלון', 'טן', 'סופר יודה',
  'באקרafe', 'מקס סטוק', 'מקס', ' דיל', 'עזריאלי',
]

// Upscale small images, convert to grayscale, stretch contrast, then binarize
// with Otsu's method. Returns a PNG blob (lossless — no JPEG ringing on edges).
export function preprocessForOCR(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Upscale to ~1800px on the long edge so small print is legible
      const target = 1800
      const long = Math.max(img.width, img.height)
      const scale = long < target ? target / long : Math.min(1, 2200 / long)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      const imgData = ctx.getImageData(0, 0, w, h)
      const d = imgData.data

      // 1) Grayscale (luminance) + build histogram
      const hist = new Array(256).fill(0)
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
        d[i] = d[i + 1] = d[i + 2] = g
        hist[g]++
      }

      // 2) Contrast stretch using 2nd/98th percentile to ignore outliers
      const total = w * h
      let lo = 0, hi = 255, acc = 0
      const loCut = total * 0.02, hiCut = total * 0.98
      for (let t = 0; t < 256; t++) { acc += hist[t]; if (acc >= loCut) { lo = t; break } }
      acc = 0
      for (let t = 0; t < 256; t++) { acc += hist[t]; if (acc >= hiCut) { hi = t; break } }
      const range = Math.max(1, hi - lo)
      for (let i = 0; i < d.length; i += 4) {
        let v = ((d[i] - lo) / range) * 255
        v = v < 0 ? 0 : v > 255 ? 255 : v
        d[i] = d[i + 1] = d[i + 2] = v
      }

      // 3) Otsu threshold on the stretched image
      const hist2 = new Array(256).fill(0)
      for (let i = 0; i < d.length; i += 4) hist2[d[i] | 0]++
      let sum = 0
      for (let t = 0; t < 256; t++) sum += t * hist2[t]
      let sumB = 0, wB = 0, maxVar = 0, threshold = 127
      for (let t = 0; t < 256; t++) {
        wB += hist2[t]
        if (wB === 0) continue
        const wF = total - wB
        if (wF === 0) break
        sumB += t * hist2[t]
        const mB = sumB / wB
        const mF = (sum - sumB) / wF
        const between = wB * wF * (mB - mF) * (mB - mF)
        if (between > maxVar) { maxVar = between; threshold = t }
      }
      // Bias slightly brighter so thin strokes survive
      threshold = Math.min(255, threshold + 8)
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] > threshold ? 255 : 0
        d[i] = d[i + 1] = d[i + 2] = v
      }

      ctx.putImageData(imgData, 0, 0)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('blob failed'))),
        'image/png'
      )
    }
    img.onerror = reject
    img.src = url
  })
}

export function parseReceiptText(rawText) {
  const text = rawText || ''
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // ---- Merchant: known chain first, else first substantial Hebrew/Latin line
  let merchant = ''
  const flat = text.replace(/\s+/g, ' ')
  for (const name of KNOWN_MERCHANTS) {
    if (flat.includes(name)) { merchant = name; break }
  }
  if (!merchant) {
    const cand = lines
      .slice(0, 6)
      .find((l) => /[א-ת]/.test(l) && l.replace(/[^א-תa-zA-Z]/g, '').length >= 3)
    merchant = (cand || '').slice(0, 60)
  }

  // ---- Total: prefer labeled lines, search bottom-up
  let total = null
  const labelRe = /(?:סה[״"'`]?\s*כ|לתשלום|total|amount\s*due|grand\s*total|סכום\s*כולל)/i
  const amtRe = /(\d{1,3}(?:[,.]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})/g
  for (let i = lines.length - 1; i >= 0; i--) {
    if (labelRe.test(lines[i])) {
      const nums = [...lines[i].matchAll(amtRe)].map((m) =>
        parseFloat(m[1].replace(/,(?=\d{3}\b)/g, '').replace(',', '.'))
      )
      const valid = nums.filter((n) => !isNaN(n) && n > 0)
      if (valid.length) { total = Math.max(...valid); break }
      // label may be on its own line — check the next non-empty line
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const n2 = [...lines[j].matchAll(amtRe)].map((m) =>
          parseFloat(m[1].replace(/,(?=\d{3}\b)/g, '').replace(',', '.'))
        ).filter((n) => !isNaN(n) && n > 0)
        if (n2.length) { total = Math.max(...n2); break }
      }
      if (total) break
    }
  }
  // Fallback: largest decimal amount anywhere in the bottom half
  if (!total) {
    const nums = []
    lines.slice(Math.floor(lines.length / 2)).forEach((l) => {
      ;[...l.matchAll(/\d+[.,]\d{2}/g)].forEach((m) =>
        nums.push(parseFloat(m[0].replace(',', '.')))
      )
    })
    if (nums.length) total = Math.max(...nums)
  }

  // ---- Date
  let date = null
  const dateRe = /(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/
  for (const l of lines) {
    const m = l.match(dateRe)
    if (m) {
      let [, day, month, year] = m
      if (year.length === 2) year = '20' + year
      const [dd, mm, yy] = [+day, +month, +year]
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 2000 && yy <= 2099) {
        date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        break
      }
    }
  }

  return {
    merchant,
    total: total ? Math.round(total * 100) / 100 : null,
    date: date || new Date().toISOString().split('T')[0],
    rawText: text.trim(),
  }
}

// Compress for storage (keeps the original photo readable, smaller upload)
export function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1500
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX }
        else { w = Math.round((w * MAX) / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

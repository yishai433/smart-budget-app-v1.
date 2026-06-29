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

      // 1) Grayscale (luminance) into a flat array
      const gray = new Float64Array(w * h)
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        gray[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
      }

      // 2) Adaptive (local-mean) thresholding via an integral image.
      //    Each pixel is compared to the mean brightness of its neighborhood,
      //    so shadows and uneven lighting no longer wipe out whole regions —
      //    far more robust than a single global Otsu threshold.
      const iw = w + 1
      const integral = new Float64Array(iw * (h + 1))
      for (let y = 1; y <= h; y++) {
        let rowSum = 0
        for (let x = 1; x <= w; x++) {
          rowSum += gray[(y - 1) * w + (x - 1)]
          integral[y * iw + x] = integral[(y - 1) * iw + x] + rowSum
        }
      }

      // Window ~ 1/24 of the short edge; C = brightness margin (anti-noise)
      const radius = Math.max(10, Math.floor(Math.min(w, h) / 24))
      const C = 12
      for (let y = 0; y < h; y++) {
        const y1 = Math.max(0, y - radius)
        const y2 = Math.min(h - 1, y + radius)
        for (let x = 0; x < w; x++) {
          const x1 = Math.max(0, x - radius)
          const x2 = Math.min(w - 1, x + radius)
          const count = (x2 - x1 + 1) * (y2 - y1 + 1)
          const sum =
            integral[(y2 + 1) * iw + (x2 + 1)] -
            integral[y1 * iw + (x2 + 1)] -
            integral[(y2 + 1) * iw + x1] +
            integral[y1 * iw + x1]
          const mean = sum / count
          const idx = (y * w + x) * 4
          const v = gray[y * w + x] < mean - C ? 0 : 255
          d[idx] = d[idx + 1] = d[idx + 2] = v
        }
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

// Build a human-readable name from merchant + date, e.g. "שופרסל-2026-06-09".
// Strips characters illegal in filenames / storage paths; falls back to "חשבונית".
export function receiptName(merchant, date) {
  const clean = (merchant || '')
    .replace(/[\/\\:*?"<>|#\[\]]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
  const base = clean || 'חשבונית'
  return date ? `${base}-${date}` : base
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

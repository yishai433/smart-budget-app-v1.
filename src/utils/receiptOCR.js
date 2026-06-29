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

// Full pipeline: auto-crop receipt from background → upscale → adaptive threshold.
// Receipt paper (bright white) stands out from most backgrounds.  We project
// row/column brightness to find its bounding box, crop to it, then binarize.
export function preprocessForOCR(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      // ── 1. Downscale for fast analysis (no need for full-res here)
      const A = 600
      const as = Math.min(1, A / Math.max(img.width, img.height))
      const aw = Math.round(img.width * as)
      const ah = Math.round(img.height * as)
      const ac = document.createElement('canvas')
      ac.width = aw; ac.height = ah
      ac.getContext('2d').drawImage(img, 0, 0, aw, ah)
      const ad = ac.getContext('2d').getImageData(0, 0, aw, ah).data

      // Grayscale for projection
      const gray = new Uint8Array(aw * ah)
      for (let i = 0, p = 0; i < ad.length; i += 4, p++)
        gray[p] = (ad[i] * 0.299 + ad[i + 1] * 0.587 + ad[i + 2] * 0.114) | 0

      // ── 2. Row / column brightness projections to locate the receipt
      // Thermal paper is very white (>165). Wood/tables are usually darker.
      const BRIGHT = 165
      const colScore = new Float32Array(aw)
      const rowScore = new Float32Array(ah)
      for (let y = 0; y < ah; y++)
        for (let x = 0; x < aw; x++) {
          const b = gray[y * aw + x] > BRIGHT ? 1 : 0
          colScore[x] += b; rowScore[y] += b
        }
      for (let x = 0; x < aw; x++) colScore[x] /= ah
      for (let y = 0; y < ah; y++) rowScore[y] /= aw

      // Smooth projections (5-tap moving average) to avoid jagged crop edges
      const smooth = (a) => {
        const out = new Float32Array(a.length)
        for (let i = 0; i < a.length; i++) {
          let s = 0, c = 0
          for (let d = -2; d <= 2; d++) {
            const j = i + d
            if (j >= 0 && j < a.length) { s += a[j]; c++ }
          }
          out[i] = s / c
        }
        return out
      }
      const cs = smooth(colScore), rs = smooth(rowScore)

      // Find first/last column and row where bright-pixel ratio exceeds MIN
      const MIN = 0.35
      let cx1 = 0, cx2 = aw - 1, cy1 = 0, cy2 = ah - 1
      for (let x = 0; x < aw; x++) if (cs[x] > MIN) { cx1 = x; break }
      for (let x = aw - 1; x >= 0; x--) if (cs[x] > MIN) { cx2 = x; break }
      for (let y = 0; y < ah; y++) if (rs[y] > MIN) { cy1 = y; break }
      for (let y = ah - 1; y >= 0; y--) if (rs[y] > MIN) { cy2 = y; break }

      // Map crop box back to original image coords + 2% padding
      const pad = 0.02
      const sx = Math.max(0, Math.round((cx1 / aw - pad) * img.width))
      const sy = Math.max(0, Math.round((cy1 / ah - pad) * img.height))
      const ex = Math.min(img.width,  Math.round((cx2 / aw + pad) * img.width))
      const ey = Math.min(img.height, Math.round((cy2 / ah + pad) * img.height))
      const sw = ex - sx, sh = ey - sy

      // Only use the crop if it's meaningfully smaller than the full image
      const useCrop = sw < img.width * 0.88 || sh < img.height * 0.88

      // ── 3. Render the cropped region at ~1800px for OCR
      const TARGET = 1800
      const srcX = useCrop ? sx : 0,   srcY = useCrop ? sy : 0
      const srcW = useCrop ? sw : img.width, srcH = useCrop ? sh : img.height
      const ocrScale = TARGET / Math.max(srcW, srcH)
      const fw = Math.round(srcW * ocrScale), fh = Math.round(srcH * ocrScale)

      const canvas = document.createElement('canvas')
      canvas.width = fw; canvas.height = fh
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, fw, fh)
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, fw, fh)

      // ── 4. Adaptive local-mean threshold (integral image)
      const imgData = ctx.getImageData(0, 0, fw, fh)
      const d = imgData.data
      const g = new Float64Array(fw * fh)
      for (let i = 0, p = 0; i < d.length; i += 4, p++)
        g[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114

      const iw = fw + 1
      const intg = new Float64Array(iw * (fh + 1))
      for (let y = 1; y <= fh; y++) {
        let rs2 = 0
        for (let x = 1; x <= fw; x++) {
          rs2 += g[(y - 1) * fw + (x - 1)]
          intg[y * iw + x] = intg[(y - 1) * iw + x] + rs2
        }
      }
      const R = Math.max(10, Math.floor(Math.min(fw, fh) / 24))
      const C = 10
      for (let y = 0; y < fh; y++) {
        const y1 = Math.max(0, y - R), y2 = Math.min(fh - 1, y + R)
        for (let x = 0; x < fw; x++) {
          const x1 = Math.max(0, x - R), x2 = Math.min(fw - 1, x + R)
          const cnt = (x2 - x1 + 1) * (y2 - y1 + 1)
          const s = intg[(y2+1)*iw+(x2+1)] - intg[y1*iw+(x2+1)]
                  - intg[(y2+1)*iw+x1]     + intg[y1*iw+x1]
          const v = g[y * fw + x] < s / cnt - C ? 0 : 255
          const idx = (y * fw + x) * 4
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

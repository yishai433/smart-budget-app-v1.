// Receipt OCR: turn a photo of a supermarket receipt into plain text, so the app can pull out
// the product lines. Runs on the home server (Israeli IP, has internet); the phone only sends
// the photo. Hebrew + English, with light image clean-up first for sharper reading.
import { createWorker } from 'tesseract.js'
import { Jimp } from 'jimp'

let workerP = null   // one shared Tesseract worker, created on first use

async function worker(cachePath, log) {
  if (!workerP) {
    workerP = createWorker('heb+eng', 1, {
      cachePath,                     // keep the language data on the data volume between restarts
      logger: () => {},
      errorHandler: e => log?.('OCR worker:', e?.message || e),
    }).then(async w => {
      // bias the engine toward whole lines of mixed Hebrew/numbers, not single characters
      await w.setParameters({ preserve_interword_spaces: '1' })
      return w
    })
  }
  return workerP
}

// Clean the photo up for OCR: upright, greyscale, a touch more contrast, and a sane size.
async function prep(buf) {
  const img = await Jimp.read(buf)
  const w = img.bitmap.width
  if (w > 1600) img.resize({ w: 1600 })
  if (w < 900) img.resize({ w: 1000 })        // tiny photos: upscale a little so letters have pixels
  img.greyscale().contrast(0.35).normalize()
  return await img.getBuffer('image/png')
}

// Returns the receipt's text (best effort). Throws only on a truly broken image.
export async function ocrReceipt(buf, cachePath, log) {
  let input = buf
  try { input = await prep(buf) } catch (e) { log?.('עיבוד תמונה נכשל, ממשיך עם המקור:', e.message) }
  const w = await worker(cachePath, log)
  const { data } = await w.recognize(input)
  return (data?.text || '').trim()
}

export async function closeReceipt() { if (workerP) { try { (await workerP).terminate() } catch { /* ignore */ } workerP = null } }

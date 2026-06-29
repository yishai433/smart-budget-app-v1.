import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { useApp } from '../contexts/AppContext'
import { useTranslation } from 'react-i18next'
import { preprocessForOCR, parseReceiptText, compressImage, receiptName } from '../utils/receiptOCR'

export default function ReceiptScanner({ onClose, onSaved, transactionId, transactionDesc, date }) {
  const { t } = useTranslation()
  const { user, addReceipt } = useApp()
  const [preview, setPreview] = useState(null)
  const [blob, setBlob] = useState(null)
  const [step, setStep] = useState('pick') // pick | analyzing | confirm
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState({ merchant: '', total: '', date: date || new Date().toISOString().split('T')[0] })
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    // Keep a readable JPEG for storage; build a cleaned image just for OCR
    const compressed = await compressImage(file)
    setBlob(compressed)
    setPreview(URL.createObjectURL(compressed))
    runOCR(file)
  }

  const runOCR = async (file) => {
    setStep('analyzing')
    setProgress(0)
    setProgressLabel('מכין תמונה...')
    try {
      // Preprocess: grayscale + contrast + binarization → much cleaner for OCR
      const ocrBlob = await preprocessForOCR(file)

      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['heb', 'eng'], 1, {
        logger: ({ status, progress: p }) => {
          if (status.includes('loading') || status.includes('initializ')) {
            setProgressLabel('טוען מנוע זיהוי...')
            setProgress(Math.round((p || 0) * 35))
          } else if (status === 'recognizing text') {
            setProgressLabel('מזהה טקסט...')
            setProgress(35 + Math.round((p || 0) * 65))
          }
        },
      })
      // PSM 6 = assume a uniform block of text — best for receipts
      await worker.setParameters({ tessedit_pageseg_mode: '6' })
      const { data: { text } } = await worker.recognize(ocrBlob)
      await worker.terminate()

      const parsed = parseReceiptText(text)
      setRawText(parsed.rawText)
      setResult({
        merchant: parsed.merchant || transactionDesc || '',
        total: parsed.total?.toString() || '',
        date: parsed.date || date || new Date().toISOString().split('T')[0],
      })
      setStep('confirm')
    } catch (e) {
      console.error('OCR error:', e)
      setRawText('')
      setResult({
        merchant: transactionDesc || '',
        total: '',
        date: date || new Date().toISOString().split('T')[0],
      })
      setStep('confirm')
    }
  }

  const handleSave = async () => {
    if (!blob || !user) return
    setUploading(true)
    setError('')
    try {
      const receiptDate = result.date || new Date().toISOString().split('T')[0]
      const ts = Date.now()
      // Name file by merchant + date (ts keeps it unique)
      const fileName = `${receiptName(result.merchant, receiptDate)}_${ts}.jpg`
      const storagePath = `receipts/${user.uid}/${fileName}`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, blob)
      const imageUrl = await getDownloadURL(storageRef)
      await addReceipt({
        imageUrl,
        storagePath,
        date: receiptDate,
        transactionId: transactionId || null,
        description: result.merchant || transactionDesc || '',
        total: result.total ? parseFloat(result.total) : null,
        rawText: rawText || '',
      })
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('receipt upload error:', err)
      setError('שגיאה בשמירת החשבונית — נסה שוב')
    }
    setUploading(false)
  }

  const reset = () => { setStep('pick'); setPreview(null); setBlob(null); setError(''); setRawText(''); setShowRaw(false) }

  return (
    <>
      <motion.div
        className="sheet-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={step === 'pick' ? onClose : undefined}
      />
      <div className="sheet-viewport">
        <motion.div
          className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">🧾 סריקת חשבונית</h2>
            <button onClick={onClose} style={{
              background: 'var(--c-bg)', border: 'none', borderRadius: 20,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--c-text2)',
            }}>✕</button>
          </div>

          <div className="sheet-body">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            <input ref={galleryRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

            {/* STEP: pick */}
            {step === 'pick' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button className="btn btn-primary btn-full" style={{ fontSize: 17, padding: 16 }}
                  onClick={() => cameraRef.current.click()}>
                  📷 {t('receipts.camera')}
                </button>
                <button className="btn btn-secondary btn-full" style={{ fontSize: 17, padding: 16 }}
                  onClick={() => galleryRef.current.click()}>
                  🖼 {t('receipts.gallery')}
                </button>
              </div>
            )}

            {/* STEP: analyzing */}
            {step === 'analyzing' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                {preview && (
                  <div style={{ width: '100%', height: 160, borderRadius: 'var(--r-lg)', overflow: 'hidden', position: 'relative' }}>
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(3px)', opacity: 0.6 }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                      🔍
                    </div>
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 16 }}>מנתח חשבונית...</div>
                <div style={{ width: '100%', background: 'var(--c-sep)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'var(--c-primary)', borderRadius: 8 }}
                  />
                </div>
                <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{progressLabel} {progress}%</div>
                <div style={{ fontSize: 12, color: 'var(--c-text3)', textAlign: 'center' }}>
                  בפעם הראשונה יורד קובץ שפה (~10MB) — רק פעם אחת
                </div>
              </div>
            )}

            {/* STEP: confirm */}
            {step === 'confirm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {preview && (
                  <div style={{ width: '100%', height: 140, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                    <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {(result.merchant || result.total) ? (
                  <div style={{ background: 'rgba(22,163,73,0.08)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--c-primary)', fontWeight: 600 }}>
                    ✓ זוהה — בדוק ותקן אם נדרש
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,149,0,0.1)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--c-warning)', fontWeight: 600 }}>
                    ⚠️ לא הצלחתי לקרוא הכל — מלא ידנית
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">🏪 שם עסק</label>
                  <input className="input-field" value={result.merchant}
                    onChange={e => setResult(s => ({ ...s, merchant: e.target.value }))}
                    placeholder="שם העסק / המסעדה" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">💰 סכום (₪)</label>
                    <input className="input-field" type="number" inputMode="decimal"
                      value={result.total}
                      onChange={e => setResult(s => ({ ...s, total: e.target.value }))}
                      placeholder="0.00" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">📅 תאריך</label>
                    <input className="input-field" type="date"
                      value={result.date}
                      onChange={e => setResult(s => ({ ...s, date: e.target.value }))} />
                  </div>
                </div>

                {rawText && (
                  <div>
                    <button
                      onClick={() => setShowRaw(v => !v)}
                      style={{ background: 'none', border: 'none', color: 'var(--c-text2)',
                        fontSize: 12, cursor: 'pointer', padding: '2px 0', fontWeight: 600 }}
                    >
                      {showRaw ? '▾ הסתר טקסט גולמי' : '▸ הצג טקסט שזוהה'}
                    </button>
                    {showRaw && (
                      <pre style={{
                        marginTop: 6, background: 'var(--c-bg)', borderRadius: 'var(--r-md)',
                        padding: '10px 12px', fontSize: 11, lineHeight: 1.5, color: 'var(--c-text2)',
                        maxHeight: 140, overflow: 'auto', whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit', direction: 'rtl', textAlign: 'right',
                      }}>
                        {rawText}
                      </pre>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={reset}>
                    📷 שוב
                  </button>
                  <button className="btn btn-primary" style={{ flex: 2 }}
                    onClick={handleSave} disabled={uploading}>
                    {uploading ? '⏳ שומר...' : '💾 שמור חשבונית'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(217,107,107,0.12)', color: 'var(--c-danger)',
                borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

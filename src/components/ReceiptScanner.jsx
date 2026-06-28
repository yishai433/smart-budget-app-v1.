import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { useApp } from '../contexts/AppContext'
import { useTranslation } from 'react-i18next'

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1500
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

export default function ReceiptScanner({ onClose, onSaved, transactionId, transactionDesc, date }) {
  const { t } = useTranslation()
  const { user, addReceipt } = useApp()
  const [preview, setPreview] = useState(null)
  const [blob, setBlob] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    const compressed = await compressImage(file)
    setBlob(compressed)
    setPreview(URL.createObjectURL(compressed))
  }

  const handleSave = async () => {
    if (!blob || !user) return
    setUploading(true)
    setError('')
    try {
      const receiptDate = date || new Date().toISOString().split('T')[0]
      const ts = Date.now()
      const storagePath = `receipts/${user.uid}/${receiptDate}_${ts}.jpg`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, blob)
      const imageUrl = await getDownloadURL(storageRef)
      await addReceipt({
        imageUrl,
        storagePath,
        date: receiptDate,
        transactionId: transactionId || null,
        description: transactionDesc || '',
      })
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('receipt upload error:', err)
      setError('שגיאה בשמירת החשבונית — נסה שוב')
    }
    setUploading(false)
  }

  return (
    <>
      <motion.div
        className="sheet-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">🧾 {t('receipts.scan')}</h2>
          <button
            onClick={onClose}
            style={{ background: 'var(--c-bg)', border: 'none', borderRadius: 20,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--c-text2)' }}
          >✕</button>
        </div>

        <div className="sheet-body">
          {/* Hidden file inputs */}
          <input
            ref={cameraRef}
            type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <input
            ref={galleryRef}
            type="file" accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />

          {!preview ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary btn-full"
                style={{ fontSize: 17, padding: '16px' }}
                onClick={() => cameraRef.current.click()}
              >
                {t('receipts.camera')}
              </button>
              <button
                className="btn btn-secondary btn-full"
                style={{ fontSize: 17, padding: '16px' }}
                onClick={() => galleryRef.current.click()}
              >
                {t('receipts.gallery')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderRadius: 'var(--r-lg)',
                overflow: 'hidden',
                background: '#f0f0f0',
                maxHeight: 320,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={preview}
                  alt="receipt"
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setPreview(null); setBlob(null) }}
                >
                  {t('receipts.retake')}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleSave}
                  disabled={uploading}
                >
                  {uploading ? t('receipts.uploading') : `💾 ${t('receipts.saveReceipt')}`}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(217,107,107,0.12)',
              color: 'var(--c-danger)',
              borderRadius: 'var(--r-md)',
              padding: '12px 16px',
              fontSize: 13,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

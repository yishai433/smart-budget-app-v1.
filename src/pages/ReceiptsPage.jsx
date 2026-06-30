import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import ReceiptScanner from '../components/ReceiptScanner'
import { receiptName } from '../utils/receiptOCR'

const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function groupByMonth(receipts) {
  return receipts.reduce((groups, r) => {
    const key = r.date?.substring(0, 7) || 'unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
    return groups
  }, {})
}

function monthLabel(key, lang) {
  if (key === 'unknown') return lang === 'he' ? 'לא ידוע' : 'Unknown'
  const [year, month] = key.split('-')
  const idx = parseInt(month, 10) - 1
  const name = lang === 'he' ? HEBREW_MONTHS[idx] : EN_MONTHS[idx]
  return `${name} ${year}`
}

function formatDay(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return `${parts[2]}.${parts[1]}.${parts[0].slice(2)}`
}

async function downloadReceipt(receipt, fileBase) {
  const name = `${fileBase}.jpg`
  // Prefer base64 stored in Firestore; fall back to Storage URL
  const src = receipt.imageData || receipt.imageUrl
  if (!src) return

  const getBlob = async () => {
    if (receipt.imageData) {
      const res = await fetch(receipt.imageData)
      return res.blob()
    }
    const res = await fetch(receipt.imageUrl)
    return res.blob()
  }

  if (navigator.share) {
    try {
      const blob = await getBlob()
      const file = new File([blob], name, { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileBase })
        return
      }
    } catch {}
  }
  try {
    const blob = await getBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    const src2 = receipt.imageData || receipt.imageUrl
    if (src2) window.open(src2, '_blank')
  }
}

function ReceiptCard({ receipt, onDelete }) {
  const { t } = useTranslation()
  const [viewing, setViewing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    await downloadReceipt(receipt, receiptName(receipt.description, receipt.date))
    setDownloading(false)
  }
  const imgSrc = receipt.imageData || receipt.imageUrl

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'var(--c-card)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Thumbnail */}
        <div
          onClick={() => imgSrc && setViewing(true)}
          style={{
            width: '100%', height: 160,
            background: '#f0f0f0',
            overflow: 'hidden',
            cursor: imgSrc ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {imgSrc
            ? <img src={imgSrc} alt="receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 40 }}>🧾</span>
          }
        </div>

        {/* Info */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
            {receipt.description || '🧾 חשבונית'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>
              📅 {formatDay(receipt.date)}
            </div>
            {receipt.total != null && (
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-danger)' }}>
                ₪{receipt.total.toLocaleString()}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, padding: '9px 6px', fontSize: 12 }}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? '⏳' : '⬇️'} {t('receipts.download')}
            </button>
            <button
              className="btn"
              style={{ flex: 1, padding: '9px 6px', fontSize: 12, background: 'rgba(217,107,107,0.1)', color: 'var(--c-danger)' }}
              onClick={() => setConfirmDelete(true)}
            >
              🗑 {t('receipts.deleteReceipt')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Full-screen viewer */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setViewing(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.92)',
              zIndex: 300,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.img
              src={imgSrc}
              alt="full"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              style={{ maxWidth: '100%', maxHeight: '78dvh', borderRadius: 'var(--r-md)', objectFit: 'contain' }}
              onClick={e => e.stopPropagation()}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: 12, marginTop: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="btn btn-primary"
                style={{ padding: '12px 24px' }}
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? '⏳' : '⬇️'} {t('receipts.download')}
              </button>
              <button
                className="btn"
                style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
                onClick={() => setViewing(false)}
              >
                ✕ סגור
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300 }}
              onClick={() => setConfirmDelete(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                background: 'var(--c-card)',
                borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
                padding: '28px 20px calc(var(--nav-h) + var(--safe-bottom) + 16px)',
                zIndex: 301, textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>🗑</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t('receipts.deleteConfirm')}</div>
              <div style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 24 }}>לא ניתן לשחזר את החשבונית</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-full"
                  style={{ padding: 15, fontSize: 16, background: 'rgba(217,107,107,0.12)', color: 'var(--c-danger)', fontWeight: 700 }}
                  onClick={() => { onDelete(receipt.id, receipt.storagePath); setConfirmDelete(false) }}
                >
                  {t('common.delete')}
                </button>
                <button className="btn btn-secondary btn-full" style={{ padding: 15, fontSize: 16 }} onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default function ReceiptsPage() {
  const { t, i18n } = useTranslation()
  const { receipts, deleteReceipt } = useApp()
  const [showScanner, setShowScanner] = useState(false)
  const showToast = (msg) => {
    window.dispatchEvent(new CustomEvent('sb-toast', { detail: msg }))
  }

  const handleDelete = async (id, storagePath) => {
    await deleteReceipt(id, storagePath)
    showToast('🗑 החשבונית נמחקה')
  }

  const grouped = groupByMonth(receipts)
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>🧾 {t('receipts.title')}</h1>
          <button
            onClick={() => setShowScanner(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: 20,
              padding: '8px 16px',
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + {t('receipts.scan')}
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          {receipts.length > 0
            ? `${receipts.length} חשבוניות שמורות`
            : t('receipts.noReceiptsHint')}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {receipts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
          >
            <div className="empty-icon">🧾</div>
            <h3>{t('receipts.noReceipts')}</h3>
            <p>{t('receipts.noReceiptsHint')}</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 8, padding: '12px 28px' }}
              onClick={() => setShowScanner(true)}
            >
              📷 {t('receipts.scan')}
            </button>
          </motion.div>
        ) : (
          monthKeys.map(key => (
            <div key={key} style={{ marginBottom: 28 }}>
              <h3 style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--c-text2)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
                paddingRight: 4,
              }}>
                {monthLabel(key, i18n.language)}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <AnimatePresence>
                  {grouped[key].map(r => (
                    <ReceiptCard key={r.id} receipt={r} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showScanner && (
          <ReceiptScanner
            onClose={() => setShowScanner(false)}
            onSaved={() => showToast(`✅ ${t('receipts.receiptSaved')}`)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

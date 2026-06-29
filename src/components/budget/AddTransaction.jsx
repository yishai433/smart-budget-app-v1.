import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import ReceiptScanner from '../ReceiptScanner'

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly']

export default function AddTransaction({ onClose }) {
  const { t } = useTranslation()
  const { addTransaction, CATEGORIES, settings } = useApp()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [otherNote, setOtherNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedTxId, setSavedTxId] = useState(null)
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const cats = CATEGORIES[type]

  const handleSave = async () => {
    if (!amount || !category) return
    setSaving(true)
    setError('')
    try {
      const txId = await addTransaction({
        type,
        amount: parseFloat(amount),
        description: description || (category === 'other' ? otherNote : ''),
        category,
        date,
        isRecurring,
        frequency: isRecurring ? frequency : null,
      })
      if (settings.receiptsEnabled) {
        setSavedTxId(txId)
        setShowReceiptPrompt(true)
      } else {
        onClose()
      }
    } catch (err) {
      const msg = err.code === 'permission-denied'
        ? '❌ Firestore לא מאפשר כתיבה — בדוק חוקי אבטחה'
        : err.code === 'unavailable'
        ? '❌ אין חיבור לאינטרנט'
        : `❌ שגיאה: ${err.code || err.message}`
      setError(msg)
    }
    setSaving(false)
  }

  if (showScanner) {
    return (
      <AnimatePresence>
        <ReceiptScanner
          transactionId={savedTxId}
          transactionDesc={description}
          date={date}
          onClose={onClose}
          onSaved={onClose}
        />
      </AnimatePresence>
    )
  }

  if (showReceiptPrompt) {
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
          <div className="sheet-body" style={{ alignItems: 'center', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🧾</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              {t('receipts.attachAfterSave')}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--c-text2)', marginBottom: 28, lineHeight: 1.5 }}>
              {t('receipts.attachDesc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button
                className="btn btn-primary btn-full"
                style={{ fontSize: 16, padding: '15px' }}
                onClick={() => { setShowReceiptPrompt(false); setShowScanner(true) }}
              >
                📷 {t('receipts.attach')}
              </button>
              <button
                className="btn btn-secondary btn-full"
                style={{ fontSize: 15 }}
                onClick={onClose}
              >
                {t('receipts.skip')}
              </button>
            </div>
          </div>
        </motion.div>
      </>
    )
  }

  return (
    <>
      <motion.div
        className="sheet-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="sheet-handle" />

        {/* Type toggle */}
        <div className="sheet-header">
          <h2 className="sheet-title">
            {type === 'income' ? t('transaction.addIncome') : t('transaction.addExpense')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'var(--c-bg)', border: 'none', borderRadius: 20,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--c-text2)' }}
          >✕</button>
        </div>

        <div className="sheet-body">
          <div className="segment">
            <button
              className={`segment-btn ${type === 'expense' ? 'active' : ''}`}
              onClick={() => { setType('expense'); setCategory('') }}
            >
              🔴 {t('transaction.expense')}
            </button>
            <button
              className={`segment-btn ${type === 'income' ? 'active' : ''}`}
              onClick={() => { setType('income'); setCategory('') }}
            >
              🟢 {t('transaction.income')}
            </button>
          </div>

          {/* Amount */}
          <div className="input-group">
            <label className="input-label">{t('transaction.amount')}</label>
            <input
              className="input-field"
              type="number"
              inputMode="decimal"
              placeholder={t('transaction.amountPlaceholder')}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', letterSpacing: -0.5 }}
            />
          </div>

          {/* Description */}
          <div className="input-group">
            <label className="input-label">{t('transaction.description')}</label>
            <input
              className="input-field"
              placeholder={t('transaction.descriptionPlaceholder')}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="input-group">
            <label className="input-label">{t('transaction.category')}</label>
            <div className="cat-grid">
              {cats.map(cat => (
                <button
                  key={cat.id}
                  className={`cat-btn ${category === cat.id ? 'selected' : ''}`}
                  onClick={() => { setCategory(cat.id); if (cat.id !== 'other') setOtherNote('') }}
                >
                  <span className="cat-emoji">{cat.emoji}</span>
                  <span className="cat-label">{t(`categories.${cat.id}`)}</span>
                </button>
              ))}
            </div>
            <AnimatePresence>
              {category === 'other' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <input
                    className="input-field"
                    style={{ marginTop: 8 }}
                    placeholder="מה זה? (פרט כאן)"
                    value={otherNote}
                    onChange={e => setOtherNote(e.target.value)}
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date */}
          <div className="input-group">
            <label className="input-label">{t('transaction.date')}</label>
            <input
              className="input-field"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Recurring toggle */}
          <div className="toggle-wrap">
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t('transaction.isRecurring')}</div>
              <div style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>
                {t('budget.recurringExpenses')}
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
              />
              <div className="toggle-track" />
              <div className="toggle-thumb" />
            </label>
          </div>

          <AnimatePresence>
            {isRecurring && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="input-group">
                  <label className="input-label">{t('transaction.frequency')}</label>
                  <div className="segment">
                    {FREQUENCIES.map(f => (
                      <button
                        key={f}
                        className={`segment-btn ${frequency === f ? 'active' : ''}`}
                        onClick={() => setFrequency(f)}
                      >
                        {t(`transaction.${f}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div style={{
              background: 'rgba(217,107,107,0.12)', color: 'var(--c-danger)',
              borderRadius: 'var(--r-md)', padding: '12px 16px',
              fontSize: 13, fontWeight: 500, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={!amount || !category || saving}
            style={{ opacity: (!amount || !category) ? 0.5 : 1, marginTop: 4 }}
          >
            {saving ? '⏳ שומר...' : t('common.save')}
          </button>
        </div>
      </motion.div>
    </>
  )
}

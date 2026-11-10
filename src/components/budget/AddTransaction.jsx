import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import ReceiptScanner from '../ReceiptScanner'
import CategoryIcon from '../CategoryIcon'
import useScrollLock from '../../hooks/useScrollLock'
import { X } from 'lucide-react'
import { suggestCategory } from '../../utils/suggestCategory'

// local calendar date as YYYY-MM-DD (toISOString is UTC and gives yesterday after midnight)
const localDate = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly']

// Memoized so typing in the amount/description fields doesn't re-render all
// category buttons (each renders an SVG icon) on every keystroke.
const CategoryGrid = memo(function CategoryGrid({ cats, category, onSelect, t }) {
  return (
    <div className="cat-grid">
      {cats.map(cat => (
        <button
          key={cat.id}
          className={`cat-btn ${category === cat.id ? 'selected' : ''}`}
          onClick={() => onSelect(cat.id)}
          style={category === cat.id
            ? { borderColor: cat.color, background: cat.color + '18' }
            : {}}
        >
          <div className="cat-icon" style={{ color: category === cat.id ? cat.color : 'var(--c-text2)' }}>
            <CategoryIcon id={cat.id} size={26} />
          </div>
          <span className="cat-label">{t(`categories.${cat.id}`)}</span>
        </button>
      ))}
    </div>
  )
})

export default function AddTransaction({ onClose }) {
  useScrollLock()
  const { t } = useTranslation()
  const { addTransaction, CATEGORIES, settings, isPro, transactions, members, splitEnabled, user } = useApp()
  const [paidBy, setPaidBy] = useState(user?.uid || '')
  const [personal, setPersonal] = useState(false)
  const he = (settings.language || 'he') === 'he'
  const amountRef = useRef(null)
  const categoryTouched = useRef(false)
  const [autoPicked, setAutoPicked] = useState(false)
  const [type, setType] = useState('expense')
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(() => localDate())
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [otherNote, setOtherNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedTxId, setSavedTxId] = useState(null)
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const cats = CATEGORIES[type]

  // open ready to type the amount (after the sheet finished sliding in)
  useEffect(() => {
    const id = setTimeout(() => amountRef.current?.focus({ preventScroll: true }), 320)
    return () => clearTimeout(id)
  }, [])

  // suggest a category from the description until the person picks one themselves
  useEffect(() => {
    if (categoryTouched.current) return
    const s = suggestCategory(description, transactions, type)
    if (s && cats.some(c => c.id === s)) { setCategory(s); setAutoPicked(true) }
    else if (autoPicked) { setCategory(''); setAutoPicked(false) }
  }, [description, type]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectCategory = useCallback((id) => {
    categoryTouched.current = true
    setAutoPicked(false)
    setCategory(id)
    if (id !== 'other') setOtherNote('')
  }, [])

  const handleAmountChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '')
    const parts = val.split('.')
    if (parts.length > 2) return               // no double dots
    if (parts[1] && parts[1].length > 2) return // max 2 decimal places
    setAmountStr(val)
  }
  const handleAmountBlur = () => {
    const n = parseFloat(amountStr)
    if (!isNaN(n) && n > 0) setAmountStr(n.toFixed(2))
  }
  const actualAmount = parseFloat(amountStr) || 0

  const handleSave = async (addAnother = false) => {
    if (!actualAmount || !category) return
    setSaving(true)
    setError('')
    try {
      const txId = await addTransaction({
        type,
        amount: actualAmount,
        description: description || (category === 'other' ? otherNote : ''),
        category,
        date,
        isRecurring,
        frequency: isRecurring ? frequency : null,
        ...(splitEnabled && type === 'expense' ? { paidBy, scope: personal ? 'personal' : 'shared' } : {}),
      })
      if (addAnother === true) {
        // keep the sheet open for the next one; date and type stay
        setAmountStr(''); setDescription(''); setCategory(''); setOtherNote('')
        setIsRecurring(false); setPersonal(false); setAutoPicked(false); categoryTouched.current = false
        window.dispatchEvent(new CustomEvent('sb-toast', { detail: he ? '✅ נשמר, אפשר להוסיף עוד' : '✅ Saved, add another' }))
        setTimeout(() => amountRef.current?.focus({ preventScroll: true }), 50)
      } else if (settings.receiptsEnabled && isPro) {
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
        <div className="sheet-viewport">
          <motion.div
            className="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
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
        </div>
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
      <div className="sheet-viewport">
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="sheet-handle" />

        {/* Type toggle */}
        <div className="sheet-header">
          <h2 className="sheet-title">
            {type === 'income' ? t('transaction.addIncome') : t('transaction.addExpense')}
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        <div className="sheet-body" style={{ gap: 12 }}>
          {/* Type toggle */}
          <div className="segment">
            <button className={`segment-btn ${type === 'expense' ? 'active' : ''}`}
              onClick={() => { setType('expense'); setCategory(''); categoryTouched.current = false; setAutoPicked(false) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-danger)' }} />
              {t('transaction.expense')}
            </button>
            <button className={`segment-btn ${type === 'income' ? 'active' : ''}`}
              onClick={() => { setType('income'); setCategory(''); categoryTouched.current = false; setAutoPicked(false) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-success)' }} />
              {t('transaction.income')}
            </button>
          </div>

          {/* Amount + Description — compact side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 10 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">סכום (₪)</label>
              <input
                className="input-field"
                ref={amountRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amountStr}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                style={{ textAlign: 'center', fontWeight: 800, fontSize: 20,
                  color: actualAmount ? 'var(--c-text)' : undefined }}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">{t('transaction.description')}</label>
              <input
                className="input-field"
                placeholder={t('transaction.descriptionPlaceholder')}
                value={description} onChange={e => setDescription(e.target.value)}
                style={{ textAlign: 'center' }}
              />
            </div>
          </div>

          {/* Category */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">
              {t('transaction.category')}
              {autoPicked && <span style={{ fontWeight: 500, color: 'var(--c-text3)', marginInlineStart: 8 }}>{he ? 'נבחרה לפי התיאור' : 'picked from description'}</span>}
            </label>
            <CategoryGrid cats={cats} category={category} onSelect={handleSelectCategory} t={t} />
            <AnimatePresence>
              {category === 'other' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginTop: 8, position: 'relative' }}>
                    <input className="input-field" placeholder="פירוט (אופציונלי)" value={otherNote}
                      onChange={e => setOtherNote(e.target.value)} style={{ paddingRight: 36 }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>✏️</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date */}
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">{t('transaction.date')}</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {[[0, he ? 'היום' : 'Today'], [-1, he ? 'אתמול' : 'Yesterday']].map(([off, label]) => (
                <button key={off} type="button" className="btn btn-secondary"
                  onClick={() => setDate(localDate(off))}
                  style={{ padding: '6px 14px', fontSize: 13, ...(date === localDate(off) ? { borderColor: 'var(--c-primary)', color: 'var(--c-primary)', fontWeight: 700 } : {}) }}>
                  {label}
                </button>
              ))}
            </div>
            <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Who paid + personal (only when the household splits expenses) */}
          {splitEnabled && type === 'expense' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">{he ? 'מי שילם' : 'Paid by'}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {members.map(m => (
                  <button key={m.uid} type="button" className="btn btn-secondary"
                    onClick={() => setPaidBy(m.uid)}
                    style={{ padding: '6px 14px', fontSize: 13, ...(paidBy === m.uid ? { borderColor: 'var(--c-primary)', color: 'var(--c-primary)', fontWeight: 700 } : {}) }}>
                    {m.uid === user?.uid ? (he ? 'אני' : 'Me') : (m.firstName || (he ? 'בן בית' : 'Member'))}
                  </button>
                ))}
              </div>
              <div className="toggle-wrap" style={{ marginTop: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{he ? 'הוצאה אישית' : 'Personal expense'}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{he ? 'לא מתחלקת בין החברים' : 'Not split between members'}</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={personal} onChange={e => setPersonal(e.target.checked)} />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="toggle-wrap">
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t('transaction.isRecurring')}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{t('budget.recurringExpenses')}</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              <div className="toggle-track" />
              <div className="toggle-thumb" />
            </label>
          </div>

          <AnimatePresence>
            {isRecurring && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">{t('transaction.frequency')}</label>
                  <div className="segment">
                    {FREQUENCIES.map(f => (
                      <button key={f} className={`segment-btn ${frequency === f ? 'active' : ''}`} onClick={() => setFrequency(f)}>
                        {t(`transaction.${f}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div style={{ background: 'var(--c-danger-light)', color: 'var(--c-danger)',
              borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, fontWeight: 500, textAlign: 'center' }}>
              {error}
            </div>
          )}
        </div>

        <div className="sheet-footer" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleSave(true)}
            disabled={!actualAmount || !category || saving}
            style={{ flex: 1, opacity: (!actualAmount || !category) ? 0.45 : 1, fontSize: 14, fontWeight: 600 }}
          >
            {he ? 'שמור והוסף עוד' : 'Save & add another'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSave()}
            disabled={!actualAmount || !category || saving}
            style={{ flex: 1, opacity: (!actualAmount || !category) ? 0.45 : 1, transition: 'opacity 0.2s', fontSize: 16, fontWeight: 700 }}
          >
            {saving ? (he ? '⏳ שומר...' : '⏳ Saving...') : t('common.save')}
          </button>
        </div>
      </motion.div>
      </div>
    </>
  )
}

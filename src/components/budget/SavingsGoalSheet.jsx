import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import useScrollLock from '../../hooks/useScrollLock'
import useDelayedFocus from '../../hooks/useDelayedFocus'
import { formatAmount } from '../../utils/format'

// Bottom sheet for savings goals. Two modes:
//  - goal === null → create a new goal (name, target, optional "by" month)
//  - goal given    → deposit to / withdraw from it, or delete it
export default function SavingsGoalSheet({
  goal, currentMonthKey, lang, cur, onCreate, onChange, onDelete, onClose,
}) {
  useScrollLock()
  const he = lang === 'he'
  const isNew = !goal
  const focusRef = useDelayedFocus()
  const [name, setName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const amount = parseFloat(amountStr)
  const validAmount = amount > 0

  const handleSave = () => {
    if (isNew && !name.trim()) { setError(he ? 'תנו ליעד שם' : 'Give the goal a name'); return }
    if (!validAmount) { setError(he ? 'הזינו סכום גדול מאפס' : 'Enter an amount above zero'); return }
    if (isNew) onCreate({ name: name.trim(), target: amount, date })
    else onChange(amount)
  }

  const handleWithdraw = () => {
    if (!validAmount) { setError(he ? 'הזינו סכום גדול מאפס' : 'Enter an amount above zero'); return }
    if (amount > goal.saved) { setError(he ? 'אי אפשר למשוך יותר ממה שנחסך' : "You can't withdraw more than you've saved"); return }
    onChange(-amount)
  }

  const clearError = () => setError('')

  return createPortal((
    <>
      <motion.div className="sheet-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="sheet-viewport">
        <motion.div className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">
              {isNew ? (he ? 'יעד חדש' : 'New goal') : (he ? `הפקדה ל${goal.name}` : `Add to ${goal.name}`)}
            </h2>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label={he ? 'סגור' : 'Close'}>
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="sheet-body" style={{ alignItems: 'center', textAlign: 'center' }}>
            {!isNew && (
              <p style={{ fontSize: 13.5, color: 'var(--c-text2)' }}>
                {he ? 'נחסך עד עכשיו ' : 'Saved so far: '}
                <b dir="ltr" className="num" style={{ color: 'var(--c-text)' }}>{formatAmount(goal.saved, cur)}</b>
                {' '}{he ? 'מתוך ' : 'of '}
                <span dir="ltr" className="num">{formatAmount(goal.target, cur)}</span>
              </p>
            )}

            {isNew && (
              <input
                ref={focusRef}
                className="input-field"
                type="text"
                maxLength={40}
                placeholder={he ? 'שם היעד, למשל חופשה' : 'Goal name, e.g. Vacation'}
                value={name}
                onChange={e => { setName(e.target.value); clearError() }}
                style={{ textAlign: 'center', width: '80%' }}
              />
            )}

            <input
              ref={isNew ? undefined : focusRef}
              className="input-field"
              type="text"
              inputMode="decimal"
              placeholder={isNew ? (he ? 'סכום היעד' : 'Target amount') : '0'}
              value={amountStr}
              onChange={e => { setAmountStr(e.target.value.replace(/[^0-9.]/g, '')); clearError() }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ textAlign: 'center', fontWeight: 800, fontSize: 24, width: '60%' }}
            />

            {isNew && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--c-text2)' }}>
                {he ? 'עד (אופציונלי)' : 'By (optional)'}
                <input
                  className="input-field"
                  type="month"
                  min={currentMonthKey}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ width: 'auto' }}
                />
              </label>
            )}

            <div style={{ fontSize: 12.5, color: 'var(--c-danger)', minHeight: 16 }}>{error}</div>
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>
                {he ? 'שמירה' : 'Save'}
              </button>
              {!isNew && (
                <button className="btn" onClick={handleWithdraw} style={{ flex: 1 }}>
                  {he ? 'משיכה' : 'Withdraw'}
                </button>
              )}
            </div>
            {!isNew && (
              <button
                className="btn"
                onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                style={{ width: '100%', marginTop: 8, color: 'var(--c-danger)' }}
              >
                {confirmDelete
                  ? (he ? 'לחצו שוב כדי למחוק את היעד' : 'Tap again to delete this goal')
                  : (he ? 'מחיקת יעד' : 'Delete goal')}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

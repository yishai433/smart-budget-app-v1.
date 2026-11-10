import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import useScrollLock from '../../hooks/useScrollLock'
import useDelayedFocus from '../../hooks/useDelayedFocus'
import { formatAmount } from '../../utils/format'

// Bottom sheet for setting / changing / removing one category's budget.
//  - currentLimit: the limit in effect for the viewed month (or null)
//  - hasOverride:  this month already has its own override for the category
//  - onSave(amount, onlyThisMonth) / onClear(onlyThisMonth)
export default function CategoryBudgetSheet({
  catId, spent, currentLimit, hasOverride, monthText, isCurrentMonth, lang, cur,
  onSave, onClear, onClose,
}) {
  useScrollLock()
  const { t } = useTranslation()
  const inputRef = useDelayedFocus()
  const [amountStr, setAmountStr] = useState(currentLimit ? String(currentLimit) : '')
  const [onlyThisMonth, setOnlyThisMonth] = useState(hasOverride)
  const [error, setError] = useState('')
  const he = lang === 'he'
  const catName = t(`categories.${catId}`)

  const handleSave = () => {
    const val = parseFloat(amountStr)
    if (!(val > 0)) {
      setError(he ? 'הזן סכום גדול מאפס' : 'Enter an amount above zero')
      return
    }
    onSave(val, onlyThisMonth)
  }

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
            <h2 className="sheet-title">{he ? `תקציב ${catName}` : `${catName} budget`}</h2>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }} aria-label={he ? 'סגור' : 'Close'}>
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="sheet-body" style={{ alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, color: 'var(--c-text2)', lineHeight: 1.5 }}>
              {isCurrentMonth
                ? (he ? 'הוצאתם החודש ' : 'Spent this month: ')
                : (he ? `הוצאתם ב${monthText}: ` : `Spent in ${monthText}: `)}
              <b dir="ltr" className="num" style={{ color: 'var(--c-text)' }}>{formatAmount(spent, cur)}</b>
            </p>

            <input
              ref={inputRef}
              className="input-field"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={e => { setAmountStr(e.target.value.replace(/[^0-9.]/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ textAlign: 'center', fontWeight: 800, fontSize: 26, width: '60%' }}
            />

            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontSize: 13.5, color: 'var(--c-text)',
            }}>
              <input
                type="checkbox"
                checked={onlyThisMonth}
                onChange={e => setOnlyThisMonth(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--c-primary)' }}
              />
              <span>{he ? `רק ל${monthText}` : `Only for ${monthText}`}</span>
            </label>
            <p style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: -6 }}>
              {onlyThisMonth
                ? (he ? 'התקציב הקבוע של הקטגוריה לא ישתנה' : "The category's regular budget won't change")
                : (he ? 'יחול על כל החודשים, עד שתשנו' : 'Applies to every month until you change it')}
            </p>

            <div style={{ fontSize: 12.5, color: 'var(--c-danger)', minHeight: 16 }}>{error}</div>
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>
                {he ? 'שמירה' : 'Save'}
              </button>
              {currentLimit != null && (
                <button className="btn" onClick={() => onClear(onlyThisMonth)} style={{ flex: 1 }}>
                  {he ? 'הסרה' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

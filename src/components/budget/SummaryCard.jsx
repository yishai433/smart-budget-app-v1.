import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownLeft, ArrowUpRight, Wallet, X, Receipt } from 'lucide-react'
import { formatNumber, formatAmount, formatMoney } from '../../utils/format'
import { monthLabel } from '../../utils/months'
import { cumulativeByDay } from '../../utils/insights'
import CategoryIcon from '../CategoryIcon'
import useScrollLock from '../../hooks/useScrollLock'
import useDelayedFocus from '../../hooks/useDelayedFocus'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    prev.current = value
    if (start === end) return
    const duration = 600
    const startTime = performance.now()
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      // Settle on the exact value (with cents) on the final frame; count up otherwise
      setDisplay(p >= 1 ? end : start + (end - start) * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])

  return <>{formatNumber(display)}</>
}

// Compact progress ring drawn on the dark hero — reads "month state" instantly.
function StateRing({ pct }) {
  const R = 26
  const C = 2 * Math.PI * R
  const clamped = Math.max(0, Math.min(100, pct))
  const over = pct > 100
  const stroke = over ? 'var(--c-danger)' : '#221f0f'
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(34,31,15,0.15)" strokeWidth="6" />
        <motion.circle
          cx="32" cy="32" r={R} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (clamped / 100) * C }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--c-ink-text)',
      }} className="num">
        {clamped}%
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, children, tint, color, valueColor, onClick }) {
  return (
    <div
      className="kpi"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="kpi-chip" style={{ background: tint, color }}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" dir="ltr" style={{ color: valueColor || 'var(--c-text)', textAlign: 'start', marginTop: 2 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function formatShort(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) }
  catch { return dateStr }
}

// Sheet listing every income/expense transaction for the current month —
// opened by tapping the corresponding KPI tile.
function FilteredTransactionsSheet({ type, transactions, CATEGORIES, cur, total, onClose }) {
  useScrollLock()
  const { t } = useTranslation()
  const title = type === 'income' ? t('budget.income') : t('budget.expenses')
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  const getCatDef = (tx) => CATEGORIES[tx.type]?.find(c => c.id === tx.category)
    || { color: '#667085' }

  return createPortal((
    <>
      <motion.div className="sheet-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="sheet-viewport">
        <motion.div className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <div>
              <h2 className="sheet-title" style={{ fontSize: 17 }}>{title}</h2>
              <div style={{ fontSize: 12.5, color: 'var(--c-text2)', marginTop: 2 }}>
                {sorted.length} {t('budget.thisMonth')}
              </div>
            </div>
            <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          <div className="sheet-body" style={{ padding: '12px 0 20px', gap: 0 }}>
            {sorted.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Receipt size={22} strokeWidth={1.8} /></div>
                <p>{t('budget.noTransactions')}</p>
              </div>
            ) : (
              <div style={{ margin: '0 20px' }}>
                {sorted.map((tx, i) => {
                  const catDef = getCatDef(tx)
                  return (
                    <div key={tx.id} className="list-item" style={{
                      cursor: 'default', background: 'transparent',
                      borderBottom: i < sorted.length - 1 ? '1px solid var(--c-sep)' : 'none',
                    }}>
                      <div className="list-icon" style={{ background: catDef.color + '14', color: catDef.color }}>
                        <CategoryIcon id={tx.category} size={17} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.description || t(`categories.${tx.category}`)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                          {t(`categories.${tx.category}`)}
                          {tx.date && <span className="num"> · {formatShort(tx.date)}</span>}
                        </div>
                      </div>
                      <div dir="ltr" className="num" style={{
                        fontWeight: 700, fontSize: 15,
                        color: type === 'income' ? 'var(--c-success)' : 'var(--c-danger)',
                        flexShrink: 0,
                      }}>
                        {formatMoney(tx.amount, tx.type, cur)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
              <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--c-text2)' }}>{t('budget.thisMonth')}</span>
              <div dir="ltr" className="num" style={{
                fontWeight: 700, fontSize: 20, letterSpacing: -0.5,
                color: type === 'income' ? 'var(--c-success)' : 'var(--c-text)',
              }}>
                {formatAmount(total, cur)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

// Prompt asking for this month's budget — shown automatically when the
// current month has no budget set yet.
function BudgetPromptSheet({ lang, cur, onSave, onClose }) {
  useScrollLock()
  const amountRef = useDelayedFocus()
  const [amountStr, setAmountStr] = useState('')
  const actualAmount = parseFloat(amountStr) || 0

  const handleSave = () => {
    if (actualAmount <= 0) return
    onSave(actualAmount)
  }

  return createPortal((
    <>
      <motion.div className="sheet-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      />
      <div className="sheet-viewport">
        <motion.div className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="sheet-handle" />
          <div className="sheet-header">
            <h2 className="sheet-title">{lang === 'he' ? 'מה התקציב לחודש?' : "What's this month's budget?"}</h2>
            {onClose && (
              <button onClick={onClose} className="btn-icon" style={{ width: 32, height: 32 }}>
                <X size={17} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="sheet-body" style={{ alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, color: 'var(--c-text2)', lineHeight: 1.5 }}>
              {lang === 'he'
                ? 'קבעו כמה אתם מתכננים להוציא החודש — אפשר לשנות בכל רגע מההגדרות'
                : "Set how much you plan to spend this month — you can change it anytime from Settings"}
            </p>
            <input
              ref={amountRef}
              className="input-field"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ textAlign: 'center', fontWeight: 800, fontSize: 26, width: '60%' }}
            />
          </div>
          <div className="sheet-footer">
            <button
              className="btn btn-primary btn-full"
              onClick={handleSave}
              disabled={actualAmount <= 0}
              style={{ opacity: actualAmount > 0 ? 1 : 0.45 }}
            >
              {lang === 'he' ? 'שמור תקציב' : 'Save budget'}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

// showKpis: the saved / expenses / income tiles (off on the home screen to keep it calm)
export default function SummaryCard({ showKpis = false }) {
  const { t } = useTranslation()
  const { totalIncome, totalExpenses, settings, monthTransactions, CATEGORIES, monthlyBudget, setMonthlyBudget, household, isCurrentMonth, monthKey } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'
  const [filterOpen, setFilterOpen] = useState(null) // 'income' | 'expense' | null
  const [budgetPromptDismissed, setBudgetPromptDismissed] = useState(false)

  const hasBudget = monthlyBudget != null
  const spentPct = hasBudget && monthlyBudget > 0
    ? Math.round((totalExpenses / monthlyBudget) * 100)
    : (totalExpenses > 0 ? 100 : 0)
  const savingsAmount = totalIncome - totalExpenses
  const overAmount = hasBudget ? totalExpenses - monthlyBudget : 0
  const overBudget = overAmount > 0
  // Under/at budget → show how much was used. Over budget → show the overage as a negative number.

  const money = (v) => `${v < 0 ? '−' : ''}${formatAmount(v, cur)}`

  // End-of-month forecast: spending so far, extrapolated at the same daily pace.
  // Only for the current month, and only once there are a few days of data
  // (day 1–3 would give wild numbers) and before the month is over.
  const FORECAST_MIN_DAYS = 4
  const today = new Date()
  const daysElapsed = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const showForecast = isCurrentMonth && totalExpenses > 0
    && daysElapsed >= FORECAST_MIN_DAYS && daysElapsed < daysInMonth
  const forecast = showForecast ? Math.round((totalExpenses / daysElapsed) * daysInMonth) : 0
  const forecastDiff = showForecast && hasBudget ? forecast - monthlyBudget : 0 // >0 = over budget
  const forecastOver = forecastDiff > 0

  // Hero number: what's left of the budget, the overage, or (no budget) what was spent
  const remaining = hasBudget ? Math.max(0, monthlyBudget - totalExpenses) : 0
  const heroAmount = overBudget ? overAmount : hasBudget ? remaining : totalExpenses
  const daysLeft = daysInMonth - daysElapsed + 1
  const perDayLeft = isCurrentMonth && hasBudget && !overBudget ? Math.round(remaining / daysLeft) : 0

  // Pace chart: cumulative spending per day (right to left in Hebrew, day 1 on the
  // reading side) against a straight line from 0 to the budget.
  const pace = (() => {
    const cum = cumulativeByDay(monthTransactions, monthKey)
    const upto = isCurrentMonth ? Math.min(daysElapsed, cum.length) : cum.length
    if (upto < 2 || cum[upto - 1] <= 0) return {}
    const W = 300, H = 70, PAD = 6
    const max = Math.max(hasBudget ? monthlyBudget : 0, cum[upto - 1]) * 1.05
    const rtl = lang === 'he'
    const xOf = (i) => { const f = cum.length > 1 ? i / (cum.length - 1) : 0; return rtl ? W - f * W : f * W }
    const yOf = (v) => H - PAD - (v / max) * (H - PAD * 2)
    const pts = cum.slice(0, upto).map((v, i) => [Math.round(xOf(i) * 10) / 10, Math.round(yOf(v) * 10) / 10])
    return {
      points: pts.map(p => p.join(',')).join(' '),
      last: pts[pts.length - 1],
      budgetLine: hasBudget ? { x1: xOf(0), y1: yOf(0), x2: xOf(cum.length - 1), y2: yOf(monthlyBudget) } : null,
    }
  })()

  return (
    <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Hero — what's left to spend, big and centred, with the month's pace under it */}
      <motion.div
        className="hero-ink"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ fontSize: 13, color: 'var(--c-ink-text2)' }}>
          {overBudget
            ? (lang === 'he' ? 'חרגנו מהתקציב ב' : 'Over budget by')
            : hasBudget
              ? (isCurrentMonth ? (lang === 'he' ? 'נשאר להוציא החודש' : 'Left to spend this month') : (lang === 'he' ? `נשאר מהתקציב ב${monthLabel(monthKey, lang)}` : `Left from the budget in ${monthLabel(monthKey, lang)}`))
              : (isCurrentMonth ? (lang === 'he' ? 'הוצאנו החודש' : 'Spent this month') : (lang === 'he' ? `הוצאנו ב${monthLabel(monthKey, lang)}` : `Spent in ${monthLabel(monthKey, lang)}`))}
        </div>
        <div dir="ltr" className="num" style={{
          fontSize: 56, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 6,
          color: overBudget ? 'var(--c-hero-over)' : 'var(--c-ink-text)',
        }}>
          <span style={{ fontSize: 30, fontWeight: 500, opacity: 0.75, marginInlineEnd: 2 }}>{overBudget ? '−' : ''}{cur}</span>
          <AnimatedNumber value={heroAmount} />
        </div>
        <div className="num" style={{ fontSize: 13, color: 'var(--c-ink-text2)', marginTop: 6 }}>
          {hasBudget
            ? <>{lang === 'he' ? 'מתוך' : 'of'} <b style={{ color: 'var(--c-ink-text)', fontWeight: 600 }}>{money(monthlyBudget)}</b>
                {perDayLeft > 0 && <> · {money(perDayLeft)} {lang === 'he' ? 'ליום' : 'a day'}</>}
                {!isCurrentMonth && <> · {lang === 'he' ? 'הוצאתם' : 'spent'} {money(totalExpenses)}</>}</>
            : (isCurrentMonth
                ? (lang === 'he' ? 'עוד לא הוגדר תקציב לחודש' : 'No budget set for this month yet')
                : (lang === 'he' ? 'לא הוגדר תקציב לחודש זה' : 'No budget was set for this month'))}
        </div>

        {pace.points && (
          <div style={{ marginTop: 14 }}>
            <svg viewBox="0 0 300 70" width="100%" height="70" role="img"
              aria-label={lang === 'he' ? 'קצב ההוצאות מתחילת החודש מול קצב התקציב' : 'Spending so far this month against the budget pace'}
              style={{ display: 'block', overflow: 'visible' }}>
              {pace.budgetLine && <line {...pace.budgetLine} stroke="var(--c-ink-line-strong)" strokeWidth="1.2" strokeDasharray="3 5" />}
              <polyline points={pace.points} fill="none" stroke="var(--c-pace)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={pace.last[0]} cy={pace.last[1]} r="5" fill="var(--c-pace)" stroke="var(--c-ink)" strokeWidth="2" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--c-ink-text2)', marginTop: 4 }}>
              <span>{lang === 'he' ? '1 בחודש' : 'Day 1'}</span>
              {pace.budgetLine && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, borderTop: '1.5px dashed var(--c-ink-line-strong)' }} />
                  {lang === 'he' ? 'קצב התקציב' : 'Budget pace'}
                </span>
              )}
              <span>{isCurrentMonth ? (lang === 'he' ? 'היום' : 'Today') : (lang === 'he' ? 'סוף החודש' : 'Month end')}</span>
            </div>
          </div>
        )}

        {/* End-of-month forecast at the current daily pace */}
        {showForecast && forecastOver && (
          <div className="num" style={{
            marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--c-ink-line)',
            fontSize: 13, lineHeight: 1.5,
            color: forecastOver ? 'var(--c-hero-over)' : 'var(--c-ink-text2)',
            fontWeight: forecastOver ? 600 : 400,
          }}>
            {lang === 'he'
              ? <>בקצב הנוכחי תסיימו את החודש על <b dir="ltr" style={{ color: forecastOver ? 'var(--c-hero-over)' : 'var(--c-ink-text)', fontWeight: 600 }}>{money(forecast)}</b></>
              : <>At this pace you'll end the month at <b style={{ color: forecastOver ? 'var(--c-hero-over)' : 'var(--c-ink-text)', fontWeight: 600 }}>{money(forecast)}</b></>}
            {hasBudget && forecastDiff !== 0 && (
              lang === 'he'
                ? <> · {money(Math.abs(forecastDiff))} {forecastOver ? 'מעל התקציב' : 'מתחת לתקציב'}</>
                : <> · {money(Math.abs(forecastDiff))} {forecastOver ? 'over' : 'under'} budget</>
            )}
          </div>
        )}
      </motion.div>

      {/* KPI row */}
      {showKpis && (
      <motion.div
        className="kpi-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 28 }}
      >
        <Kpi icon={Wallet} label={lang === 'he' ? 'חיסכון' : 'Saved'} tint="var(--c-accent2-light)" color="var(--c-accent2-dark)" valueColor={savingsAmount >= 0 ? 'var(--c-accent2-dark)' : 'var(--c-danger)'}>
          {money(savingsAmount)}
        </Kpi>
        <Kpi icon={ArrowUpRight} label={t('budget.expenses')} tint="var(--c-bg)" color="var(--c-text2)" valueColor="var(--c-danger)" onClick={() => setFilterOpen('expense')}>
          {money(totalExpenses)}
        </Kpi>
        <Kpi icon={ArrowDownLeft} label={t('budget.income')} tint="var(--c-accent2-light)" color="var(--c-accent2-dark)" valueColor="var(--c-accent2-dark)" onClick={() => setFilterOpen('income')}>
          {money(totalIncome)}
        </Kpi>
      </motion.div>
      )}

      <AnimatePresence>
        {filterOpen && (
          <FilteredTransactionsSheet
            type={filterOpen}
            transactions={monthTransactions.filter(tx => tx.type === filterOpen)}
            CATEGORIES={CATEGORIES}
            cur={cur}
            total={filterOpen === 'income' ? totalIncome : totalExpenses}
            onClose={() => setFilterOpen(null)}
          />
        )}
      </AnimatePresence>

      {/* Ask for this month's budget once, if none is set yet — can be
          dismissed and set later from Settings. */}
      <AnimatePresence>
        {household != null && isCurrentMonth && !hasBudget && !budgetPromptDismissed && (
          <BudgetPromptSheet
            lang={lang}
            cur={cur}
            onSave={(amount) => { setMonthlyBudget(amount); setBudgetPromptDismissed(true) }}
            onClose={() => setBudgetPromptDismissed(true)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

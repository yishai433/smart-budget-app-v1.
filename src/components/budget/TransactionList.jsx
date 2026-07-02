import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import { formatMoney } from '../../utils/format'
import CategoryIcon from '../CategoryIcon'

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

function formatMonthKey(key, lang) {
  try {
    const [year, month] = key.split('-').map(Number)
    const name = lang === 'he' ? HE_MONTHS[month - 1] : format(new Date(year, month - 1, 1), 'MMMM')
    return `${name} ${year}`
  } catch { return key }
}

function groupByMonth(txs) {
  return txs.reduce((groups, tx) => {
    const key = (tx.date || 'unknown').substring(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
    return groups
  }, {})
}

function SwipeableRow({ tx, onDelete, onOpenDetail, t, catDef, cur }) {
  const x = useMotionValue(0)
  const [swiped, setSwiped] = useState(false)

  const snapTo = (val) => animate(x, val, { type: 'spring', stiffness: 420, damping: 36 })

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -220 || info.velocity.x < -700) {
      onDelete(tx.id)
    } else if (info.offset.x < -50) {
      setSwiped(true)
      snapTo(-90)
    } else {
      setSwiped(false)
      snapTo(0)
    }
  }

  const handleClick = () => {
    if (swiped) {
      setSwiped(false)
      snapTo(0)
    } else {
      onOpenDetail(tx)
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', marginBottom: 8 }}>
      {/* Delete strip — always present but only visible when swiped out */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: 90,
        background: 'var(--c-danger)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button
          onClick={() => onDelete(tx.id)}
          style={{
            background: 'none', border: 'none',
            color: 'white', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3,
          }}
        >
          <span style={{ fontSize: 20 }}>🗑</span>
          <span>{t('common.delete')}</span>
        </button>
      </div>

      <motion.div
        className="list-item"
        drag="x"
        dragConstraints={{ left: -300, right: 0 }}
        dragElastic={{ left: 0.06, right: 0 }}
        dragMomentum={false}
        style={{
          x,
          cursor: 'default',
          userSelect: 'none',
          background: 'var(--c-card)',
          position: 'relative',
          zIndex: 1,
          margin: 0,
          borderRadius: 'var(--r-lg)',
        }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      >
        <div className="list-icon" style={{ background: catDef.color + '20', color: catDef.color }}>
          <CategoryIcon id={tx.category} size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.description || t(`categories.${tx.category}`)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2, display: 'flex', gap: 6 }}>
            <span>{t(`categories.${tx.category}`)}</span>
            {tx.date && <span>· {tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}</span>}
            {tx.isRecurring && (
              <span style={{ color: 'var(--c-blue)' }}>↻ {t(`transaction.${tx.frequency}`)}</span>
            )}
          </div>
        </div>
        <div dir="ltr" style={{
          fontWeight: 700,
          fontSize: 16,
          color: tx.type === 'income' ? 'var(--c-success)' : 'var(--c-danger)',
          letterSpacing: -0.3,
          flexShrink: 0,
        }}>
          {formatMoney(tx.amount, tx.type, cur)}
        </div>
      </motion.div>
    </div>
  )
}

function formatFullDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return dateStr }
}

function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{children}</span>
    </div>
  )
}

function TransactionDetailSheet({ tx, catDef, cur, t, onDelete, onClose }) {
  const isIncome = tx.type === 'income'
  // Portal to <body> — the routed page this list lives in is a descendant of
  // AnimatedRoutes' will-change:transform wrapper, which becomes the
  // containing block for position:fixed children and breaks their placement
  // (the sheet would render relative to the full scrollable page height
  // instead of the viewport). AddTransaction avoids this by mounting at the
  // App root; a portal gets the same effect from anywhere in the tree.
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="list-icon" style={{ background: catDef.color + '20', color: catDef.color, width: 44, height: 44 }}>
                <CategoryIcon id={tx.category} size={22} />
              </div>
              <div>
                <h2 className="sheet-title" style={{ fontSize: 17 }}>
                  {tx.description || t(`categories.${tx.category}`)}
                </h2>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                  {t(`categories.${tx.category}`)}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--c-bg)', border: 'none', borderRadius: 20,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--c-text2)', flexShrink: 0,
            }}>✕</button>
          </div>

          <div className="sheet-body">
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div dir="ltr" style={{
                fontSize: 34, fontWeight: 800, letterSpacing: -0.8,
                color: isIncome ? 'var(--c-success)' : 'var(--c-danger)',
              }}>
                {formatMoney(tx.amount, tx.type, cur)}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--c-sep)' }}>
              <DetailRow label={t('transaction.date')}>{formatFullDate(tx.date)}</DetailRow>
              <div style={{ borderTop: '1px solid var(--c-sep)' }} />
              <DetailRow label={t('transaction.category')}>{t(`categories.${tx.category}`)}</DetailRow>
              {tx.isRecurring && (
                <>
                  <div style={{ borderTop: '1px solid var(--c-sep)' }} />
                  <DetailRow label={t('transaction.isRecurring')}>
                    <span style={{ color: 'var(--c-blue)' }}>↻ {t(`transaction.${tx.frequency}`)}</span>
                  </DetailRow>
                </>
              )}
            </div>
          </div>

          <div className="sheet-footer">
            <button
              className="btn btn-danger btn-full"
              onClick={() => { onDelete(tx.id); onClose() }}
            >
              🗑 {t('common.delete')}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  ), document.body)
}

export default function TransactionList({ filter = 'all' }) {
  const { t, i18n } = useTranslation()
  const { transactions, deleteTransaction, CATEGORIES, settings } = useApp()
  const cur = settings.currency
  const [detailTx, setDetailTx] = useState(null)

  const getCatDef = (tx) => CATEGORIES[tx.type]?.find(c => c.id === tx.category)
    || { emoji: tx.type === 'income' ? '💰' : '💸', color: '#636366' }

  const filtered = filter === 'recurring'
    ? transactions.filter(tx => tx.isRecurring)
    : transactions

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>{t('budget.noTransactions')}</h3>
        <p>{t('budget.noTransactionsHint')}</p>
      </div>
    )
  }

  const groups = groupByMonth(filtered)
  const lang = i18n.language

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Object.entries(groups).map(([monthKey, txs]) => (
        <div key={monthKey} style={{ marginBottom: 16 }}>
          <div style={{
            padding: '8px 20px 6px',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--c-text2)',
            letterSpacing: 0.3,
          }}>
            {formatMonthKey(monthKey, lang)}
          </div>
          <div style={{ margin: '0 16px' }}>
            <AnimatePresence initial={false}>
              {txs.map((tx, i) => {
                const catDef = getCatDef(tx)

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 340, damping: 30 }}
                  >
                    <SwipeableRow
                      tx={tx}
                      onDelete={deleteTransaction}
                      onOpenDetail={setDetailTx}
                      t={t}
                      catDef={catDef}
                      cur={cur}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      ))}

      <AnimatePresence>
        {detailTx && (
          <TransactionDetailSheet
            tx={detailTx}
            catDef={getCatDef(detailTx)}
            cur={cur}
            t={t}
            onDelete={deleteTransaction}
            onClose={() => setDetailTx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

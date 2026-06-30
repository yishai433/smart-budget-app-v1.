import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useApp } from '../../contexts/AppContext'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'

function formatDate(dateStr, t, lang) {
  try {
    const d = parseISO(dateStr)
    if (isToday(d)) return t('budget.today')
    if (isYesterday(d)) return t('budget.yesterday')
    return format(d, 'd MMM', { locale: lang === 'he' ? he : undefined })
  } catch { return dateStr }
}

function groupByDate(txs) {
  return txs.reduce((groups, tx) => {
    const key = tx.date || 'unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
    return groups
  }, {})
}

function SwipeableRow({ tx, onDelete, t, catDef, cur }) {
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
        <div className="list-icon" style={{ background: catDef.color + '20' }}>
          {catDef.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.description || t(`categories.${tx.category}`)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2, display: 'flex', gap: 6 }}>
            <span>{t(`categories.${tx.category}`)}</span>
            {tx.isRecurring && (
              <span style={{ color: 'var(--c-blue)' }}>↻ {t(`transaction.${tx.frequency}`)}</span>
            )}
          </div>
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: 16,
          color: tx.type === 'income' ? 'var(--c-success)' : 'var(--c-danger)',
          letterSpacing: -0.3,
          flexShrink: 0,
        }}>
          {tx.type === 'income' ? '+' : '-'}{cur}{(tx.amount || 0).toLocaleString()}
        </div>
      </motion.div>
    </div>
  )
}

export default function TransactionList({ filter = 'all' }) {
  const { t, i18n } = useTranslation()
  const { transactions, deleteTransaction, CATEGORIES, settings } = useApp()
  const cur = settings.currency

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

  const groups = groupByDate(filtered)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Object.entries(groups).map(([date, txs]) => (
        <div key={date} style={{ marginBottom: 16 }}>
          <div style={{
            padding: '8px 20px 6px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--c-text2)',
            letterSpacing: 0.3,
          }}>
            {formatDate(date, t, i18n.language)}
          </div>
          <div style={{ margin: '0 16px' }}>
            <AnimatePresence initial={false}>
              {txs.map((tx, i) => {
                const catDef = CATEGORIES[tx.type]?.find(c => c.id === tx.category)
                  || { emoji: tx.type === 'income' ? '💰' : '💸', color: '#636366' }

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
    </div>
  )
}

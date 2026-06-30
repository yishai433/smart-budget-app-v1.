import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
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

export default function TransactionList({ filter = 'all' }) {
  const { t, i18n } = useTranslation()
  const { transactions, deleteTransaction, CATEGORIES, settings } = useApp()
  const [swipedId, setSwipedId] = useState(null)
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
          <div className="card-list" style={{ margin: '0 16px' }}>
            <AnimatePresence initial={false}>
              {txs.map((tx, i) => {
                const catDef = CATEGORIES[tx.type]?.find(c => c.id === tx.category)
                  || { emoji: tx.type === 'income' ? '💰' : '💸', color: '#636366' }

                const isSwiped = swipedId === tx.id

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 340, damping: 30 }}
                    style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)' }}
                  >
                    {/* Delete bg — only the revealed strip on the right */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, right: 0,
                      width: 90,
                      background: 'var(--c-danger)',
                      borderRadius: '0 var(--r-lg) var(--r-lg) 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <motion.button
                        onClick={() => { deleteTransaction(tx.id); setSwipedId(null) }}
                        animate={{ scale: isSwiped ? 1 : 0.6, opacity: isSwiped ? 1 : 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        style={{
                          background: 'none', border: 'none',
                          color: 'white', fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 3,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🗑</span>
                        <span>{t('common.delete')}</span>
                      </motion.button>
                    </div>

                    <motion.div
                      className="list-item"
                      drag="x"
                      dragConstraints={{ left: -320, right: 0 }}
                      dragElastic={{ left: 0.1, right: 0 }}
                      animate={{ x: isSwiped ? -90 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -200 || info.velocity.x < -700) {
                          // Full swipe → delete immediately
                          deleteTransaction(tx.id)
                          setSwipedId(null)
                        } else if (info.offset.x < -45) {
                          setSwipedId(tx.id)
                        } else {
                          setSwipedId(null)
                        }
                      }}
                      onClick={() => { if (isSwiped) setSwipedId(null) }}
                      style={{
                        cursor: 'default', userSelect: 'none',
                        background: 'var(--c-card)',
                        position: 'relative', zIndex: 1,
                      }}
                    >
                      <div
                        className="list-icon"
                        style={{ background: catDef.color + '20' }}
                      >
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

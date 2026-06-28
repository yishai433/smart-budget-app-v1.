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

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 340, damping: 30 }}
                    style={{ position: 'relative', overflow: 'hidden' }}
                  >
                    {/* Delete action bg */}
                    <AnimatePresence>
                      {swipedId === tx.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'var(--c-danger)',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'flex-end', padding: '0 20px',
                          }}
                          onClick={() => deleteTransaction(tx.id)}
                        >
                          <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>
                            🗑 {t('common.delete')}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      className="list-item"
                      drag="x"
                      dragConstraints={{ left: -80, right: 0 }}
                      dragElastic={{ left: 0.2, right: 0 }}
                      onDragEnd={(e, info) => {
                        if (info.offset.x < -50) setSwipedId(tx.id)
                        else setSwipedId(null)
                      }}
                      onClick={() => swipedId === tx.id
                        ? setSwipedId(null)
                        : undefined
                      }
                      style={{ cursor: 'default', userSelect: 'none' }}
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

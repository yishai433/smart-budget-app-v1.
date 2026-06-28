import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import SummaryCard from '../components/budget/SummaryCard'
import TransactionList from '../components/budget/TransactionList'
import CategoryBreakdown from '../components/budget/CategoryBreakdown'
import UserAvatar from '../components/UserAvatar'
import { useApp } from '../contexts/AppContext'

const TABS = ['all', 'recurring']

export default function BudgetPage() {
  const { t } = useTranslation()
  const { settings } = useApp()
  const [tab, setTab] = useState('all')

  const now = new Date()
  const monthNames = {
    he: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  }
  const lang = settings.language || 'he'
  const monthLabel = `${monthNames[lang][now.getMonth()]} ${now.getFullYear()}`

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ paddingBottom: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 2 }}>
              {monthLabel}
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>
              {t('budget.title')}
            </h1>
          </div>

          {/* User avatar replaces the diamond */}
          <UserAvatar />
        </div>
      </div>

      {/* Summary card (overlaps header) */}
      <SummaryCard />

      {/* Category breakdown */}
      <CategoryBreakdown />

      {/* Filter tabs */}
      <div style={{ padding: '20px 16px 8px' }}>
        <div className="segment">
          {TABS.map(t2 => (
            <button
              key={t2}
              className={`segment-btn ${tab === t2 ? 'active' : ''}`}
              onClick={() => setTab(t2)}
            >
              {t2 === 'all' ? t('budget.allTransactions') : t('budget.recurringExpenses')}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <TransactionList filter={tab} />
    </div>
  )
}

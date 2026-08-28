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
      {/* Header — compact, light */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="page-eyebrow">{monthLabel}</p>
            <h1 className="page-title">{t('budget.title')}</h1>
          </div>
          <UserAvatar />
        </div>
      </div>

      {/* Summary — balance, income, expenses */}
      <SummaryCard />

      {/* Category breakdown */}
      <CategoryBreakdown />

      {/* Transactions */}
      <div style={{ padding: '22px 16px 10px' }}>
        <div className="section-label" style={{ padding: '0 4px 8px' }}>
          {t('budget.allTransactions')}
        </div>
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

      <TransactionList filter={tab} />
    </div>
  )
}

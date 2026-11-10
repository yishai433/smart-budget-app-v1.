import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import SummaryCard from '../components/budget/SummaryCard'
import TransactionList from '../components/budget/TransactionList'
import CategoryBreakdown from '../components/budget/CategoryBreakdown'
import UserAvatar from '../components/UserAvatar'
import MonthSwitcher from '../components/budget/MonthSwitcher'

const TABS = ['all', 'recurring']

export default function BudgetPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('all')

  return (
    <div className="page">
      {/* Header — compact, light */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title">{t('budget.title')}</h1>
          <UserAvatar />
        </div>
        <MonthSwitcher style={{ marginTop: 14 }} />
      </div>

      {/* Summary — balance, income, expenses */}
      <SummaryCard />

      {/* Category breakdown */}
      <CategoryBreakdown />

      {/* Transactions */}
      <div style={{ padding: '26px 16px 10px' }}>
        <div className="section-head-row">
          <h2>{t('budget.title')}</h2>
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

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import SummaryCard from '../components/budget/SummaryCard'
import TransactionList from '../components/budget/TransactionList'
import CategoryBreakdown from '../components/budget/CategoryBreakdown'
import SavingsGoals from '../components/budget/SavingsGoals'
import UpcomingRecurring from '../components/budget/UpcomingRecurring'
import UserAvatar from '../components/UserAvatar'
import MonthSwitcher from '../components/budget/MonthSwitcher'
import WhatsNew from '../components/budget/WhatsNew'
import SettleUp from '../components/budget/SettleUp'
import BudgetAlerts from '../components/budget/BudgetAlerts'
import MonthSummary from '../components/budget/MonthSummary'

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

      {/* Changes other household members made since the last visit */}
      <WhatsNew />

      {/* Summary — balance, income, expenses */}
      <SummaryCard />

      {/* Budget heads-up (80%+ or over) and last month's summary */}
      <BudgetAlerts />
      <MonthSummary />

      {/* Recurring expenses due in the next week (current month only) */}
      <UpcomingRecurring />

      {/* Who owes whom (only when the household splits expenses) */}
      <SettleUp />

      {/* Category breakdown */}
      <CategoryBreakdown />

      {/* Savings goals — shared with the household */}
      <SavingsGoals />

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

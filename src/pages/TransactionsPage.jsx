import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TransactionList from '../components/budget/TransactionList'
import UserAvatar from '../components/UserAvatar'
import MonthSwitcher from '../components/budget/MonthSwitcher'
import { useApp } from '../contexts/AppContext'
import { formatAmount } from '../utils/format'

const TABS = ['all', 'recurring']

// Every transaction of the selected month (search looks through all months),
// and the recurring ones.
export default function TransactionsPage() {
  const { t } = useTranslation()
  const { monthTransactions, totalExpenses, settings } = useApp()
  const [tab, setTab] = useState('all')
  const he = (settings.language || 'he') === 'he'

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">{he ? 'עסקאות' : 'Transactions'}</h1>
            <div className="num" style={{ fontSize: 13, color: 'var(--c-text2)', marginTop: 2 }}>
              {monthTransactions.length} {he ? 'עסקאות' : 'transactions'} · <span dir="ltr">−{formatAmount(totalExpenses, settings.currency)}</span>
            </div>
          </div>
          <UserAvatar />
        </div>
        <MonthSwitcher style={{ marginTop: 14 }} />
      </div>

      <div style={{ padding: '14px 16px 12px' }}>
        <div className="segment">
          {TABS.map(t2 => (
            <button key={t2} className={`segment-btn ${tab === t2 ? 'active' : ''}`} onClick={() => setTab(t2)}>
              {t2 === 'all' ? t('budget.allTransactions') : t('budget.recurringExpenses')}
            </button>
          ))}
        </div>
      </div>

      <TransactionList filter={tab} />
    </div>
  )
}

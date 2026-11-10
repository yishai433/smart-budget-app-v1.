import { useNavigate } from 'react-router-dom'
import SummaryCard from '../components/budget/SummaryCard'
import TransactionList from '../components/budget/TransactionList'
import CategoryBreakdown from '../components/budget/CategoryBreakdown'
import UserAvatar from '../components/UserAvatar'
import MonthSwitcher from '../components/budget/MonthSwitcher'
import SettleUp from '../components/budget/SettleUp'
import Updates from '../components/budget/Updates'
import { useApp } from '../contexts/AppContext'

function greeting(he) {
  const h = new Date().getHours()
  if (he) return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב'
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Home: what's left to spend, one line of updates, categories, and the latest
// few transactions. Everything else lives on its own tab.
export default function BudgetPage() {
  const navigate = useNavigate()
  const { user, settings } = useApp()
  const he = (settings.language || 'he') === 'he'
  const firstName = (user?.displayName || '').trim().split(/\s+/)[0]

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: 'var(--c-text2)' }}>
            {greeting(he)}{firstName ? `, ${firstName}` : ''}
          </div>
          <UserAvatar />
        </div>
        <MonthSwitcher style={{ marginTop: 10 }} />
      </div>

      <SummaryCard />
      <Updates />
      <SettleUp />
      <CategoryBreakdown limit={4} />

      <div style={{ padding: '26px 16px 10px' }}>
        <div className="section-head-row">
          <h2>{he ? 'אחרונות' : 'Latest'}</h2>
          <button className="section-action" onClick={() => navigate('/transactions')} style={{ minHeight: 44 }}>
            {he ? 'כל העסקאות' : 'All transactions'}
          </button>
        </div>
      </div>
      <TransactionList filter="all" preview={3} />
    </div>
  )
}

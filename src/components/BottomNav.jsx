import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { Home, List, Plus, BarChart2, ShoppingBag, Receipt } from 'lucide-react'

// Floating bottom bar: a dark rounded pill that sits above the page. The add
// button lives in the middle so it is in the same place on every tab.
const LABELS = {
  he: { budget: 'בית', transactions: 'עסקאות', add: 'הוספת עסקה', reports: 'דוחות', shopping: 'קניות', receipts: 'חשבוניות' },
  en: { budget: 'Home', transactions: 'Transactions', add: 'Add transaction', reports: 'Reports', shopping: 'Shopping', receipts: 'Receipts' },
}

export default function BottomNav({ onAdd }) {
  const { i18n } = useTranslation()
  const { settings, isPro } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lang = i18n.language === 'he' ? 'he' : 'en'
  const L = LABELS[lang]

  const items = [
    { path: '/', Icon: Home, key: 'budget' },
    { path: '/transactions', Icon: List, key: 'transactions' },
    { add: true, Icon: Plus, key: 'add' },
    { path: '/reports', Icon: BarChart2, key: 'reports' },
    { path: '/shopping', Icon: ShoppingBag, key: 'shopping' },
  ]
  if (settings.receiptsEnabled && isPro) items.push({ path: '/receipts', Icon: Receipt, key: 'receipts' })

  return (
    <nav className="bottom-nav" aria-label={lang === 'he' ? 'ניווט ראשי' : 'Main navigation'}>
      {items.map(item => {
        const { Icon } = item
        if (item.add) {
          return (
            <motion.button
              key="add"
              className="nav-add"
              whileTap={{ scale: 0.9 }}
              onClick={onAdd}
              aria-label={L.add}
            >
              <Icon size={24} strokeWidth={2.4} />
            </motion.button>
          )
        }
        const active = pathname === item.path
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={L[item.key]}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="nav-active-dot"
                transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              />
            )}
            <Icon size={22} strokeWidth={active ? 2.3 : 2} style={{ position: 'relative', zIndex: 1 }} />
          </button>
        )
      })}
    </nav>
  )
}

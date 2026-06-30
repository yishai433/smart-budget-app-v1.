import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { Wallet, BarChart2, ShoppingCart, Receipt, Settings } from 'lucide-react'

const BASE_TABS = [
  { path: '/',         Icon: Wallet,       key: 'budget' },
  { path: '/reports',  Icon: BarChart2,    key: 'reports' },
  { path: '/shopping', Icon: ShoppingCart, key: 'shopping' },
]
const RECEIPTS_TAB = { path: '/receipts', Icon: Receipt,  key: 'receipts' }
const SETTINGS_TAB = { path: '/settings', Icon: Settings, key: 'settings' }

const LABELS = {
  he: { budget:'תקציב', reports:'דוחות', shopping:'קניות', receipts:'חשבוניות', settings:'הגדרות' },
  en: { budget:'Budget', reports:'Reports', shopping:'Shopping', receipts:'Receipts', settings:'Settings' },
}

export default function BottomNav() {
  const { i18n } = useTranslation()
  const { settings } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lang = i18n.language === 'he' ? 'he' : 'en'

  const tabs = settings.receiptsEnabled
    ? [...BASE_TABS, RECEIPTS_TAB, SETTINGS_TAB]
    : [...BASE_TABS, SETTINGS_TAB]

  return (
    <nav className="bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      width: '100%',
      maxWidth: '430px',
      height: `calc(var(--nav-h) + var(--safe-bottom))`,
      paddingBottom: 'var(--safe-bottom)',
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: '0.5px solid rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 150,
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.path
        const { Icon } = tab
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '2px',
              border: 'none', background: 'transparent',
              cursor: 'pointer', padding: '8px 0',
              position: 'relative',
            }}
          >
            {active && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: 'absolute', top: 0,
                  width: '36px', height: '3px',
                  borderRadius: '0 0 3px 3px',
                  background: 'var(--c-primary)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <motion.div
              animate={{ scale: active ? 1.18 : 1, y: active ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.6}
                color={active ? 'var(--c-primary)' : 'var(--c-text3)'}
              />
            </motion.div>
            <span style={{
              fontSize: '10px',
              fontWeight: active ? '700' : '500',
              color: active ? 'var(--c-primary)' : 'var(--c-text3)',
              letterSpacing: '0.2px',
            }}>
              {LABELS[lang][tab.key]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { Wallet, BarChart2, ShoppingCart, Receipt, Settings } from 'lucide-react'

// Order matches the approved design's DOM order (RTL: first child renders rightmost).
const BASE_TABS = [
  { path: '/settings', Icon: Settings,      key: 'settings' },
  { path: '/shopping', Icon: ShoppingCart,  key: 'shopping' },
  { path: '/reports',  Icon: BarChart2,     key: 'reports' },
  { path: '/',         Icon: Wallet,        key: 'budget' },
]
const RECEIPTS_TAB = { path: '/receipts', Icon: Receipt,  key: 'receipts' }

const LABELS = {
  he: { budget:'תקציב', reports:'דוחות', shopping:'קניות', receipts:'חשבוניות', settings:'הגדרות' },
  en: { budget:'Budget', reports:'Reports', shopping:'Shopping', receipts:'Receipts', settings:'Settings' },
}

export default function BottomNav() {
  const { i18n } = useTranslation()
  const { settings, isPro } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lang = i18n.language === 'he' ? 'he' : 'en'

  // Receipts is inserted right after shopping (index 2) to keep budget rightmost.
  const tabs = settings.receiptsEnabled && isPro
    ? [BASE_TABS[0], BASE_TABS[1], RECEIPTS_TAB, BASE_TABS[2], BASE_TABS[3]]
    : BASE_TABS

  return (
    <nav className="bottom-nav" style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      margin: '0 auto',
      width: '100%',
      maxWidth: '480px',
      height: `calc(var(--nav-h) + var(--safe-bottom))`,
      paddingBottom: 'var(--safe-bottom)',
      background: 'var(--c-card)',
      borderTop: '1px solid var(--c-border)',
      boxShadow: '0 -4px 16px -8px rgba(32,30,29,0.14)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8px',
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
              alignItems: 'center', justifyContent: 'center', gap: '3px',
              border: 'none', background: 'transparent',
              cursor: 'pointer', padding: '8px 2px',
              position: 'relative',
              height: '100%',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {active && (
              <motion.div
                layoutId="nav-chip"
                style={{
                  position: 'absolute',
                  inset: '6px 4px',
                  background: 'var(--c-accent2-light)',
                  borderRadius: 999,
                  zIndex: 0,
                }}
                transition={{ type: 'spring', stiffness: 440, damping: 36 }}
              />
            )}
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
            }}>
              <Icon
                size={20}
                strokeWidth={active ? 2.3 : 1.8}
                color={active ? 'var(--c-accent2-dark)' : 'var(--c-text3)'}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--c-accent2-dark)' : 'var(--c-text3)',
                letterSpacing: '0.1px',
              }}>
                {LABELS[lang][tab.key]}
              </span>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

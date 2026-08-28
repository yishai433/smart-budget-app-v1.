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
  const { settings, isPro } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const lang = i18n.language === 'he' ? 'he' : 'en'

  const tabs = settings.receiptsEnabled && isPro
    ? [...BASE_TABS, RECEIPTS_TAB, SETTINGS_TAB]
    : [...BASE_TABS, SETTINGS_TAB]

  return (
    <nav className="bottom-nav" style={{
      position: 'fixed',
      bottom: `calc(var(--safe-bottom) + 10px)`,
      width: 'calc(100% - 28px)',
      maxWidth: '452px',
      height: '58px',
      borderRadius: '16px',
      /* Solid background instead of backdrop-filter blur — a fixed blurred
         element forces iOS to recompute the blur on every scroll frame, which
         was the main cause of scroll lag. */
      background: '#FFFFFF',
      border: '1px solid var(--c-border)',
      boxShadow: '0 8px 20px -6px rgba(16,24,40,0.12), 0 2px 6px rgba(16,24,40,0.05)',
      display: 'flex',
      alignItems: 'stretch',
      padding: '0 4px',
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
              alignItems: 'center', justifyContent: 'center', gap: '4px',
              border: 'none', background: 'transparent',
              cursor: 'pointer', padding: 0,
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Thin top rule marks the active tab — no heavy pill */}
            {active && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '22px', height: '2px',
                  borderRadius: '0 0 2px 2px',
                  background: 'var(--c-primary)',
                }}
                transition={{ type: 'spring', stiffness: 460, damping: 38 }}
              />
            )}
            <Icon
              size={20}
              strokeWidth={active ? 2.2 : 1.7}
              color={active ? 'var(--c-primary)' : 'var(--c-text3)'}
            />
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--c-primary)' : 'var(--c-text3)',
              letterSpacing: '0.1px',
            }}>
              {LABELS[lang][tab.key]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

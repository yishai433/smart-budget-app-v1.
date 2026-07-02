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
      bottom: `calc(var(--safe-bottom) + 12px)`,
      width: 'calc(100% - 24px)',
      maxWidth: '406px',
      height: '66px',
      borderRadius: '26px',
      /* Solid background instead of backdrop-filter blur — a fixed blurred
         element forces iOS to recompute the blur on every scroll frame, which
         was the main cause of scroll lag. */
      background: '#FFFFFF',
      boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 6px',
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
              cursor: 'pointer', padding: 0,
              position: 'relative',
              height: '100%',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {active && (
              <motion.div
                layoutId="nav-pill"
                style={{
                  position: 'absolute',
                  inset: '9px 7px',
                  background: 'var(--c-primary-light)',
                  borderRadius: '18px',
                  zIndex: 0,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
            }}>
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.6}
                color={active ? 'var(--c-primary)' : 'var(--c-text3)'}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? '700' : '500',
                color: active ? 'var(--c-primary)' : 'var(--c-text3)',
                letterSpacing: '0.2px',
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

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
      bottom: `calc(var(--safe-bottom) + 12px)`,
      width: 'calc(100% - 32px)',
      maxWidth: '448px',
      height: '60px',
      borderRadius: '18px',
      /* Solid background instead of backdrop-filter blur — a fixed blurred
         element forces iOS to recompute the blur on every scroll frame, which
         was the main cause of scroll lag. */
      background: '#FFFFFF',
      border: '1px solid var(--c-border)',
      boxShadow: '0 10px 28px -8px rgba(16,24,40,0.16), 0 2px 6px rgba(16,24,40,0.05)',
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
            {/* Soft rounded chip highlights the active tab, gliding between tabs */}
            {active && (
              <motion.div
                layoutId="nav-chip"
                style={{
                  position: 'absolute',
                  inset: '8px 6px',
                  background: 'var(--c-primary-light)',
                  borderRadius: '13px',
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
            </div>
          </button>
        )
      })}
    </nav>
  )
}

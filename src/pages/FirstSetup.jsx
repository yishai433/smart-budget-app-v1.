import { useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Languages, Coins } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { getThemePref, setThemePref } from '../utils/theme'

const CURRENCIES = ['₪', '$', '€', '£']

// Shown once, right after sign-up: language, appearance and currency in one step.
// Everything is applied immediately (so the screen itself changes language/theme as you pick)
// and saved through the same settings the Settings page uses.
export default function FirstSetup({ onDone }) {
  const { settings, changeLanguage, updateSettings } = useApp()
  const [theme, setTheme] = useState(getThemePref)
  const he = settings.language !== 'en'
  const tr = (h, e) => (he ? h : e)

  const rows = [
    { icon: <Languages size={18} strokeWidth={2} />, label: tr('שפה', 'Language'),
      options: [['he', 'עברית'], ['en', 'English']], value: settings.language, onPick: changeLanguage },
    { icon: <Palette size={18} strokeWidth={2} />, label: tr('מראה', 'Appearance'),
      options: [['light', tr('בהיר', 'Light')], ['dark', tr('כהה', 'Dark')], ['auto', tr('אוטומטי', 'Auto')]],
      value: theme, onPick: v => { setThemePref(v); setTheme(v) } },
    { icon: <Coins size={18} strokeWidth={2} />, label: tr('מטבע', 'Currency'),
      options: CURRENCIES.map(c => [c, c]), value: settings.currency, onPick: v => updateSettings({ currency: v }) },
  ]

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', padding: '24px 20px' }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="page-title" style={{ textAlign: 'center', marginBottom: 6 }}>{tr('ברוכים הבאים', 'Welcome')}</h1>
        <p style={{ textAlign: 'center', color: 'var(--c-text2)', fontSize: 14, margin: '0 0 22px', lineHeight: 1.5 }}>
          {tr('כמה בחירות קצרות לפני שמתחילים. אפשר לשנות הכול אחר כך בהגדרות.', 'A few quick choices before you start. You can change everything later in Settings.')}
        </p>
        <div className="card" style={{ marginBottom: 22 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ padding: '14px 16px', borderTop: i ? '1px solid var(--c-sep)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                <span style={{ color: 'var(--c-text2)', display: 'flex' }}>{row.icon}</span>{row.label}
              </div>
              <div className="segment">
                {row.options.map(([value, label]) => (
                  <button key={value} className={`segment-btn ${row.value === value ? 'active' : ''}`} onClick={() => row.onPick(value)}>{label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" onClick={onDone}>{tr('המשך', 'Continue')}</button>
      </motion.div>
    </div>
  )
}

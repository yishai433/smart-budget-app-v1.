import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { EditableAvatar } from '../components/UserAvatar'
import { db } from '../firebase'
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore'

function SettingRow({ icon, label, subtitle, right, onClick, danger }) {
  return (
    <motion.div
      className="list-item"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="list-icon" style={{ background: danger ? 'rgba(217,107,107,0.12)' : 'var(--c-primary-light)' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: danger ? 'var(--c-danger)' : 'var(--c-text)' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right || (onClick && <span style={{ color: 'var(--c-text3)', fontSize: 18 }}>›</span>)}
    </motion.div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle" onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { settings, changeLanguage, updateSettings, household, user, logout } = useApp()
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState('')
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const getInviteLink = () => {
    const base = window.location.href.split('#')[0]
    return `${base}#/?invite=${household?.inviteCode}`
  }

  const copyCode = () => {
    if (household?.inviteCode) {
      navigator.clipboard?.writeText(household.inviteCode).then(() => {
        showToast(t('settings.codeCopied'))
      })
    }
  }

  const shareInvite = async () => {
    const link = getInviteLink()
    const name = user?.displayName || 'חבר'
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'תקציב חכם — הזמנה',
          text: `${name} מזמין אותך להצטרף לתקציב המשותף 💰`,
          url: link,
        })
      } catch {}
    } else {
      await navigator.clipboard?.writeText(link)
      showToast('📋 קישור הזמנה הועתק!')
    }
  }

  const joinHousehold = async () => {
    if (!joinCode.trim() || !user) return
    setJoining(true)
    try {
      const code = joinCode.trim().toUpperCase()
      const q = query(collection(db, 'households'), where('inviteCode', '==', code))
      const snap = await getDocs(q)
      if (snap.empty) {
        showToast('❌ Code not found')
      } else {
        const hhDoc = snap.docs[0]
        await updateDoc(doc(db, 'households', hhDoc.id), {
          members: arrayUnion(user.uid)
        })
        showToast('✅ ' + t('settings.partnerConnected'))
        setJoinCode('')
      }
    } catch (e) {
      showToast('❌ Error joining')
    }
    setJoining(false)
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm === 'granted') {
      updateSettings({ notificationsEnabled: true })
      scheduleNotification()
      showToast('🔔 Notifications enabled!')
    }
  }

  const scheduleNotification = () => {
    // Store reminder preference; actual scheduling handled on app open
    localStorage.setItem('sb_notify', JSON.stringify({
      enabled: true,
      time: settings.reminderTime,
      frequency: settings.reminderFrequency,
    }))
  }

  const toggleNotifications = (val) => {
    if (val && notifPerm !== 'granted') {
      requestNotifications()
    } else {
      updateSettings({ notificationsEnabled: val })
    }
  }

  const CURRENCIES = ['₪', '$', '€', '£']

  return (
    <div className="page">
      <div className="page-header" style={{ paddingBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('settings.title')}</h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Profile photo */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-inner" style={{ display:'flex', justifyContent:'center', padding: '24px 20px' }}>
            <EditableAvatar size={90} />
          </div>
        </div>

        {/* Language */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('settings.language')}
        </h3>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-inner">
            <div className="segment">
              <button
                className={`segment-btn ${settings.language === 'he' ? 'active' : ''}`}
                onClick={() => changeLanguage('he')}
              >
                🇮🇱 עברית
              </button>
              <button
                className={`segment-btn ${settings.language === 'en' ? 'active' : ''}`}
                onClick={() => changeLanguage('en')}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
        </div>

        {/* Currency */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('settings.currency')}
        </h3>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-inner">
            <div className="segment">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  className={`segment-btn ${settings.currency === c ? 'active' : ''}`}
                  onClick={() => updateSettings({ currency: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('settings.notifications')}
        </h3>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="toggle-wrap">
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>🔔 {t('settings.notifications')}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{t('settings.notificationsDesc')}</div>
              </div>
              <Toggle
                checked={settings.notificationsEnabled}
                onChange={toggleNotifications}
              />
            </div>

            <AnimatePresence>
              {settings.notificationsEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div className="input-group">
                    <label className="input-label">{t('settings.reminderTime')}</label>
                    <input
                      className="input-field"
                      type="time"
                      value={settings.reminderTime}
                      onChange={e => updateSettings({ reminderTime: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">{t('settings.reminderFrequency')}</label>
                    <div className="segment">
                      {['daily','weekly','monthly'].map(f => (
                        <button
                          key={f}
                          className={`segment-btn ${settings.reminderFrequency === f ? 'active' : ''}`}
                          onClick={() => updateSettings({ reminderFrequency: f })}
                        >
                          {t(`transaction.${f}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Household */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('settings.household')}
        </h3>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Your code */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 8 }}>{t('settings.yourCode')}</p>
              <div className="code-display">{household?.inviteCode || '------'}</div>

              {/* Share / Copy buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary btn-full" onClick={copyCode}>
                  📋 העתק קוד
                </button>
                <button
                  className="btn btn-primary btn-full"
                  onClick={shareInvite}
                  style={{ boxShadow: '0 4px 14px rgba(22,163,73,0.3)' }}
                >
                  🔗 שלח הזמנה
                </button>
              </div>

              {/* Preview of invite link */}
              <div style={{
                marginTop: 10,
                background: 'var(--c-bg)',
                borderRadius: 'var(--r-md)',
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--c-text2)',
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}>
                🔗 {getInviteLink()}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--c-sep)' }} />

            {/* Join household */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 8 }}>{t('settings.joinHousehold')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-field"
                  placeholder={t('settings.enterCode')}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ letterSpacing: 3, fontWeight: 700, flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={joinHousehold}
                  disabled={!joinCode.trim() || joining}
                  style={{ padding: '13px 18px', opacity: !joinCode.trim() ? 0.5 : 1, flexShrink: 0 }}
                >
                  {joining ? '...' : t('settings.join')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Receipts */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          🧾 {t('receipts.title')}
        </h3>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-inner">
            <div className="toggle-wrap">
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t('receipts.enabled')}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                  {t('receipts.enabledDesc')} — {settings.receiptsEnabled ? 'טאב חשבוניות פעיל בתפריט' : 'יופיע כטאב בתפריט התחתון'}
                </div>
              </div>
              <Toggle
                checked={settings.receiptsEnabled}
                onChange={v => updateSettings({ receiptsEnabled: v })}
              />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SettingRow icon="ℹ️" label={t('settings.about')} subtitle={t('settings.version')} />
        </div>

        {/* Account */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          חשבון
        </h3>
        <div className="card" style={{ marginBottom: 32 }}>
          {/* User info row */}
          <div className="list-item" style={{ cursor: 'default' }}>
            <div className="list-icon" style={{ background: 'var(--c-primary-light)', fontSize: 22 }}>
              👤
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {user?.displayName || 'משתמש'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Logout */}
          <SettingRow
            icon="🚪"
            label="התנתקות"
            danger
            onClick={logout}
          />
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="snackbar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

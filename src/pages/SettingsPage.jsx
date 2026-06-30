import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { SettingsAvatar } from '../components/UserAvatar'
import UserAvatar from '../components/UserAvatar'
import AvatarCreator from '../components/AvatarCreator'
import { db } from '../firebase'
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc, setDoc, Timestamp } from 'firebase/firestore'

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
  const { settings, changeLanguage, updateSettings, household, user, activeHouseholdId, logout } = useApp()
  const { avatarConfig } = useApp()
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinResult, setJoinResult] = useState(null)
  const [members, setMembers] = useState([])
  const [currentInvite, setCurrentInvite] = useState(null) // { code, expiresAt }
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')

  // Load member profiles whenever household changes
  useEffect(() => {
    if (!household?.members?.length) return
    Promise.all(
      household.members.map(async uid => {
        try {
          const snap = await getDoc(doc(db, 'userProfiles', uid))
          const data = snap.exists() ? snap.data() : {}
          return { uid, name: data.displayName || data.email || uid.slice(0, 8), email: data.email || '' }
        } catch { return { uid, name: uid.slice(0, 8), email: '' } }
      })
    ).then(setMembers)
  }, [household])

  const showToast = (msg) => {
    window.dispatchEvent(new CustomEvent('sb-toast', { detail: msg }))
  }

  // Generate a one-time invite code stored inside the household doc (no new collection needed)
  const createInvite = async () => {
    if (!user) return
    setCreatingInvite(true)
    try {
      const part = () => Math.random().toString(36).substring(2, 5).toUpperCase()
      const code = part() + part()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const hhId = activeHouseholdId || user.uid
      await updateDoc(doc(db, 'households', hhId), {
        activeInvite: { code, expiresAt: Timestamp.fromDate(expiresAt), used: false }
      })
      setCurrentInvite({ code, expiresAt })
    } catch (e) { showToast('שגיאה ביצירת קוד: ' + (e.code || e.message)) }
    setCreatingInvite(false)
  }

  const copyInviteCode = () => {
    if (!currentInvite) return
    navigator.clipboard?.writeText(currentInvite.code).then(() => showToast('📋 קוד הועתק!'))
  }

  const shareInvite = async () => {
    if (!currentInvite) return
    const name = user?.displayName || 'חבר'
    const text = `${name} מזמין אותך לתקציב משותף 💰\nהקוד: ${currentInvite.code}\n(תקף 24 שעות)`
    if (navigator.share) {
      try { await navigator.share({ title: 'תקציב חכם', text }) } catch {}
    } else {
      await navigator.clipboard?.writeText(text)
      showToast('📋 הועתק!')
    }
  }

  const joinHousehold = async () => {
    if (!joinCode.trim() || !user) return
    setJoining(true)
    setJoinResult(null)
    try {
      const code = joinCode.trim().toUpperCase()
      // Search in households collection — no new collection, no rules issues
      const q = query(collection(db, 'households'), where('activeInvite.code', '==', code))
      const snap = await getDocs(q)
      if (snap.empty) { setJoinResult('error'); setJoining(false); return }
      const hhDoc = snap.docs[0]
      const invite = hhDoc.data().activeInvite
      if (invite.used) { setJoinResult('used'); setJoining(false); return }
      if (invite.expiresAt.toDate() < new Date()) { setJoinResult('expired'); setJoining(false); return }
      const ownerUid = hhDoc.id
      if (ownerUid === (activeHouseholdId || user.uid)) { setJoinResult('self'); setJoining(false); return }

      await updateDoc(doc(db, 'households', ownerUid), {
        members: arrayUnion(user.uid),
        'activeInvite.used': true,
      })
      await setDoc(doc(db, 'userProfiles', user.uid), { linkedHouseholdId: ownerUid }, { merge: true })
      setJoinResult('ok')
      setJoinCode('')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      console.error('join error', e)
      setJoinResult('error')
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

  // Show full-screen avatar creator when editing
  if (editingAvatar) {
    return (
      <AvatarCreator
        initialConfig={avatarConfig}
        onSave={() => setEditingAvatar(false)}
        onSkip={() => setEditingAvatar(false)}
        isOnboarding={false}
      />
    )
  }

  return (
    <div className="page">
      <div className="page-header" style={{ paddingBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('settings.title')}</h1>
          <UserAvatar />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Avatar */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-inner" style={{ display:'flex', justifyContent:'center', padding: '24px 20px' }}>
            <SettingsAvatar size={90} onEdit={() => setEditingAvatar(true)} />
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

        {/* Shared Household */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          👥 חשבון משותף
        </h3>

        {/* Status card */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-inner" style={{ padding: '16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: members.length > 1 ? 'rgba(22,163,73,0.12)' : 'var(--c-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
              }}>
                {members.length > 1 ? '👥' : '👤'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {members.length > 1 ? `חשבון משותף (${members.length} חברים)` : 'חשבון פרטי'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                  {members.length > 1
                    ? members.map(m => m.name).join(' · ')
                    : 'הזמן בן/בת זוג לשיתוף תקציב'}
                </div>
              </div>
              {members.length > 1 && (
                <div style={{
                  background: 'rgba(22,163,73,0.12)', color: 'var(--c-primary)',
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                }}>פעיל</div>
              )}
            </div>
          </div>
        </div>

        {/* Invite section */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📤 הזמן בן/בת זוג</div>
              <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>
                צור קוד חד-פעמי לשליחה — תקף 24 שעות, לא ניתן לשימוש חוזר
              </div>
            </div>

            {!currentInvite ? (
              <button
                className="btn btn-primary btn-full"
                onClick={createInvite}
                disabled={creatingInvite}
                style={{ padding: 15, fontSize: 15, boxShadow: '0 4px 14px rgba(22,163,73,0.3)' }}
              >
                {creatingInvite ? '⏳ יוצר קוד...' : '🔑 צור קוד הזמנה'}
              </button>
            ) : (
              <>
                <div style={{ background: 'var(--c-bg)', borderRadius: 'var(--r-lg)', padding: '18px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 6, letterSpacing: 0.5 }}>
                    קוד חד-פעמי · תוקף עד {currentInvite.expiresAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: 'var(--c-primary)', fontFamily: 'monospace' }}>
                    {currentInvite.code}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn btn-secondary btn-full" onClick={copyInviteCode} style={{ padding: '12px 8px', fontSize: 14 }}>
                    📋 העתק קוד
                  </button>
                  <button className="btn btn-primary btn-full" onClick={shareInvite}
                    style={{ padding: '12px 8px', fontSize: 14, boxShadow: '0 4px 14px rgba(22,163,73,0.3)' }}>
                    💬 שלח הזמנה
                  </button>
                </div>
                <button
                  onClick={() => setCurrentInvite(null)}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--c-text3)', cursor: 'pointer', textAlign: 'center' }}
                >
                  צור קוד חדש
                </button>
              </>
            )}
          </div>
        </div>

        {/* Join section */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📥 הצטרף לחשבון</div>
              <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>קיבלת קוד הזמנה? הזן אותו כאן</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                placeholder="ABC123"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinResult(null) }}
                maxLength={6}
                style={{ letterSpacing: 4, fontWeight: 800, fontSize: 18, flex: 1, textAlign: 'center' }}
              />
              <button
                className="btn btn-primary"
                onClick={joinHousehold}
                disabled={joinCode.trim().length < 4 || joining}
                style={{ padding: '13px 20px', flexShrink: 0, opacity: joinCode.trim().length < 4 ? 0.4 : 1 }}
              >
                {joining ? '⏳' : 'הצטרף'}
              </button>
            </div>

            <AnimatePresence>
              {joinResult === 'ok' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(22,163,73,0.1)', borderRadius: 'var(--r-md)', padding: '10px 14px',
                    fontSize: 13, color: 'var(--c-primary)', fontWeight: 600 }}>
                  ✅ הצטרפת בהצלחה! כל הנתונים משותפים כעת
                </motion.div>
              )}
              {joinResult === 'error' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(217,107,107,0.1)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>
                  ❌ קוד לא נמצא — בדוק שוב
                </motion.div>
              )}
              {joinResult === 'used' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(217,107,107,0.1)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>
                  ❌ קוד זה כבר נוצל — בקש קוד חדש
                </motion.div>
              )}
              {joinResult === 'expired' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(255,149,0,0.1)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--c-warning)', fontWeight: 600 }}>
                  ⏰ הקוד פג תוקף — בקש קוד חדש
                </motion.div>
              )}
              {joinResult === 'self' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(255,149,0,0.1)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, color: 'var(--c-warning)', fontWeight: 600 }}>
                  זה הקוד שלך — הזן את הקוד שקיבלת מבן/בת הזוג
                </motion.div>
              )}
            </AnimatePresence>
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

    </div>
  )
}

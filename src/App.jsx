import { useState, Component, useEffect, useLayoutEffect, useRef } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppProvider, useApp } from './contexts/AppContext'
import BottomNav from './components/BottomNav'
import OfflineBanner from './components/OfflineBanner'
import BudgetPage from './pages/BudgetPage'
import ShoppingPage from './pages/ShoppingPage'
import SettingsPage from './pages/SettingsPage'
import AddTransaction from './components/budget/AddTransaction'
import AuthPage from './pages/AuthPage'
import OnboardingIntro from './pages/OnboardingIntro'
import ReportsPage from './pages/ReportsPage'
import ReceiptsPage from './pages/ReceiptsPage'
import TransactionsPage from './pages/TransactionsPage'
import AvatarCreator from './components/AvatarCreator'
import { Wallet } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, background: 'var(--c-bg)', gap: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#201e1d' }}>משהו השתבש</h2>
          <p style={{ fontSize: 13, color: '#6b6255', maxWidth: 280 }}>
            {this.state.error?.message || 'שגיאה לא ידועה'}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.hash = '/' }}
            style={{
              background: '#2F4A3C', color: '#F4F1E6', border: 'none',
              borderRadius: 999, padding: '12px 28px', fontSize: 15,
              fontWeight: 700, cursor: 'pointer',
            }}
          >חזור לדף הבית</button>
        </div>
      )
    }
    return this.props.children
  }
}

// Tab switch: the new page fades in (opacity only, GPU-friendly) and the scroll
// position resets to the top. No exit animation and no second page on screen,
// so there is no layout jump and nothing heavy to animate.
function AnimatedRoutes() {
  const location = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div key={location.pathname} className="page-fade" style={{ minHeight: '100dvh', width: '100%' }}>
      <Routes location={location}>
        <Route path="/"         element={<ErrorBoundary><BudgetPage /></ErrorBoundary>} />
        <Route path="/transactions" element={<ErrorBoundary><TransactionsPage /></ErrorBoundary>} />
        <Route path="/reports"  element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
        <Route path="/shopping" element={<ErrorBoundary><ShoppingPage /></ErrorBoundary>} />
        <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
        <Route path="/receipts" element={<ErrorBoundary><ReceiptsPage /></ErrorBoundary>} />
      </Routes>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#2F4A3C',
      color: '#F4F1E6',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Soft glow behind the logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(226,177,60,0.25) 0%, transparent 70%)',
        }}
      />

      {/* Logo tile */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{
          width: 96, height: 96, borderRadius: 32,
          background: '#E2B13C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          position: 'relative', zIndex: 1,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Wallet size={46} color="#2A2006" strokeWidth={2} />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ fontFamily: "'Rubik', sans-serif", fontSize: 30, fontWeight: 400, letterSpacing: 0, marginTop: 26, zIndex: 1 }}
      >תקציב חכם</motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.75 }}
        transition={{ delay: 0.4 }}
        style={{ fontSize: 13, letterSpacing: 3, marginTop: 5, zIndex: 1 }}
      >SMART BUDGET</motion.div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: 8, marginTop: 40, zIndex: 1 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -5, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,248,240,0.9)' }}
          />
        ))}
      </div>
    </div>
  )
}

function AppInner() {
  const { loading, user } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('sb_intro_seen'))
  // detail is a string, or { message, actionLabel, onAction } for a toast with a button (e.g. Undo)
  const [globalToast, setGlobalToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail
      const toast = typeof d === 'string' ? { message: d } : d
      setGlobalToast(toast)
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setGlobalToast(null), toast.onAction ? 5000 : 2200)
    }
    window.addEventListener('sb-toast', handler)
    return () => { window.removeEventListener('sb-toast', handler); clearTimeout(toastTimer.current) }
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let lastHeight = vv.height
    const syncVars = () => {
      document.documentElement.style.setProperty('--kb-height', `${vv.height}px`)
      document.documentElement.style.setProperty('--kb-top', `${vv.offsetTop}px`)
      // On iOS, offsetTop stays 0 when keyboard opens — use height comparison instead
      const kbOpen = vv.offsetTop > 20 || vv.height < window.innerHeight - 120
      document.documentElement.classList.toggle('kb-open', kbOpen)
    }
    // Only the resize handler touches focus — and only when the keyboard height
    // truly changed (e.g. switching from a numeric to a full keyboard). Running
    // this on every scroll event caused a refocus loop that froze the input.
    const onResize = () => {
      syncVars()
      const delta = Math.abs(vv.height - lastHeight)
      lastHeight = vv.height
      // WebKit bug: caret goes stale when the keyboard height changes while an
      // input is focused — https://bugs.webkit.org/show_bug.cgi?id=176896.
      // A single blur+focus forces WebKit to recompute the caret. The delta
      // guard skips predictive-bar toggles and scroll jitter.
      if (delta > 60) {
        const active = document.activeElement
        if (active?.tagName === 'INPUT') {
          requestAnimationFrame(() => {
            if (document.activeElement === active) {
              active.blur()
              active.focus({ preventScroll: true })
            }
          })
        }
      }
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', syncVars)
    syncVars()
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', syncVars)
    }
  }, [])

  useEffect(() => {
    if (user && localStorage.getItem('sb_new_user')) {
      setShowOnboarding(true)
    }
  }, [user])

  if (loading) return <LoadingScreen />

  // Not logged in → feature walkthrough first (once), then auth screen
  if (!user) {
    if (showIntro) {
      return (
        <OnboardingIntro onFinish={() => {
          localStorage.setItem('sb_intro_seen', '1')
          setShowIntro(false)
        }} />
      )
    }
    return <AuthPage />
  }

  // New user → avatar onboarding
  if (showOnboarding) {
    const done = () => {
      localStorage.removeItem('sb_new_user')
      setShowOnboarding(false)
    }
    return <AvatarCreator isOnboarding onSave={done} onSkip={done} />
  }

  return (
    <>
      <OfflineBanner />
      <AnimatedRoutes />
      <BottomNav onAdd={() => setShowAdd(true)} />


      {/* AddTransaction sheet also at root level */}
      <AnimatePresence>
        {showAdd && <AddTransaction onClose={() => setShowAdd(false)} />}
      </AnimatePresence>

      {/* Global snackbar — outside AnimatedRoutes so position:fixed is viewport-relative */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            className="snackbar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {globalToast.message}
            {globalToast.onAction && (
              <button
                onClick={() => { globalToast.onAction(); setGlobalToast(null) }}
                style={{ marginInlineStart: 14, background: 'none', border: 'none', color: 'var(--c-primary)', fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: '2px 4px' }}
              >
                {globalToast.actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppInner />
      </HashRouter>
    </AppProvider>
  )
}

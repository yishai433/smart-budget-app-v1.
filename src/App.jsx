import { useState, Component, useEffect, useRef } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppProvider, useApp } from './contexts/AppContext'
import BottomNav from './components/BottomNav'
import BudgetPage from './pages/BudgetPage'
import ShoppingPage from './pages/ShoppingPage'
import SettingsPage from './pages/SettingsPage'
import AddTransaction from './components/budget/AddTransaction'
import AuthPage from './pages/AuthPage'
import ReportsPage from './pages/ReportsPage'
import ReceiptsPage from './pages/ReceiptsPage'
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
          padding: 24, background: '#F2F2F7', gap: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>משהו השתבש</h2>
          <p style={{ fontSize: 13, color: '#6C6C70', maxWidth: 280 }}>
            {this.state.error?.message || 'שגיאה לא ידועה'}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.hash = '/' }}
            style={{
              background: '#16A349', color: 'white', border: 'none',
              borderRadius: 32, padding: '12px 28px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}
          >חזור לדף הבית</button>
        </div>
      )
    }
    return this.props.children
  }
}

// Tab order matches BottomNav visual order (RTL: settings→receipts→shopping→reports→budget)
const TAB_ORDER = ['/', '/reports', '/shopping', '/receipts', '/settings']
const SLIDE_X = 28

function AnimatedRoutes() {
  const location = useLocation()
  const prevPath = useRef(location.pathname)
  const slideDir = useRef(0)

  // Compute slide direction synchronously before render (React-safe ref mutation)
  if (prevPath.current !== location.pathname) {
    const prev = TAB_ORDER.indexOf(prevPath.current)
    const curr = TAB_ORDER.indexOf(location.pathname)
    slideDir.current = (prev !== -1 && curr !== -1) ? Math.sign(curr - prev) : 0
    prevPath.current = location.pathname
  }

  const d = slideDir.current
  // RTL: higher tab index is visually on the LEFT → invert slide direction
  const isRTL = document.documentElement.dir === 'rtl'
  const x = d * SLIDE_X * (isRTL ? -1 : 1)

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -x }}
        transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.7 }}
        style={{ minHeight: '100dvh', width: '100%', willChange: 'transform' }}
      >
        <Routes location={location}>
          <Route path="/"         element={<ErrorBoundary><BudgetPage /></ErrorBoundary>} />
          <Route path="/reports"  element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
          <Route path="/shopping" element={<ErrorBoundary><ShoppingPage /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="/receipts" element={<ErrorBoundary><ReceiptsPage /></ErrorBoundary>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 34%, #1B5E38 0%, #0A2E1A 72%)',
      color: 'white',
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
          background: 'radial-gradient(circle, rgba(52,199,89,0.35) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />

      {/* Logo tile */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{
          width: 96, height: 96, borderRadius: 26,
          background: 'linear-gradient(145deg, #22C55E 0%, #16A349 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(22,163,73,0.45)',
          position: 'relative', zIndex: 1,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Wallet size={46} color="white" strokeWidth={2} />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5, marginTop: 26, zIndex: 1 }}
      >תקציב חכם</motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
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
            style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.9)' }}
          />
        ))}
      </div>
    </div>
  )
}

// FAB lives OUTSIDE AnimatePresence so it's never inside a transformed div
function GlobalFAB({ onOpen }) {
  const { pathname } = useLocation()
  if (pathname !== '/') return null
  return (
    <motion.button
      className="fab"
      whileTap={{ scale: 0.88 }}
      onClick={onOpen}
      aria-label="הוסף עסקה"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.1 }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </motion.button>
  )
}

function AppInner() {
  const { loading, user } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [globalToast, setGlobalToast] = useState('')

  useEffect(() => {
    const handler = (e) => {
      setGlobalToast(e.detail)
      setTimeout(() => setGlobalToast(''), 2200)
    }
    window.addEventListener('sb-toast', handler)
    return () => window.removeEventListener('sb-toast', handler)
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

  // Not logged in → show auth screen
  if (!user) return <AuthPage />

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
      <AnimatedRoutes />
      <BottomNav />

      {/* FAB rendered outside animated routes — never clipped by transforms */}
      <GlobalFAB onOpen={() => setShowAdd(true)} />

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
            {globalToast}
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

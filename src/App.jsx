import { useState, Component, useEffect } from 'react'
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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{ minHeight: '100dvh' }}
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
      background: 'linear-gradient(160deg, #0A2E1A 0%, #1B5E38 100%)',
      color: 'white', gap: 16,
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        style={{ fontSize: 72 }}
      >💰</motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}
      >תקציב חכם</motion.h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 0.4 }}
        style={{ fontSize: 14 }}
      >Smart Budget</motion.div>
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

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty('--vv-bottom', `${bottom}px`)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  if (loading) return <LoadingScreen />

  // Not logged in → show auth screen
  if (!user) return <AuthPage />

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

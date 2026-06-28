import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import ShoppingList from '../components/shopping/ShoppingList'
import { useApp } from '../contexts/AppContext'

function CheckoutModal({ total, onConfirm, onCancel }) {
  const { t } = useTranslation()
  const { settings } = useApp()
  const cur = settings.currency

  return (
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
      <motion.div
        className="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        style={{ padding: '0 20px calc(var(--safe-bottom) + 24px)' }}
      >
        <div className="sheet-handle" />
        <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛍️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            {t('shopping.checkout')}
          </h2>
          <p style={{ color: 'var(--c-text2)', fontSize: 15 }}>
            {t('shopping.checkoutConfirm', { amount: total.toFixed(2) })}
          </p>
          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--c-danger)', margin: '20px 0' }}>
            {cur}{total.toFixed(2)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary btn-full" onClick={onConfirm}>
            ✓ {t('shopping.addToExpenses')}
          </button>
          <button className="btn btn-secondary btn-full" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </motion.div>
    </>
  )
}

export default function ShoppingPage() {
  const { t } = useTranslation()
  const { checkoutShopping, clearShoppingList, shoppingItems } = useApp()
  const [checkoutTotal, setCheckoutTotal] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleCheckout = (total) => setCheckoutTotal(total)

  const handleConfirmCheckout = async () => {
    await checkoutShopping(checkoutTotal)
    setCheckoutTotal(null)
    showToast('✅ ' + t('shopping.checkout'))
  }

  const handleClear = async () => {
    await clearShoppingList()
    showToast(t('shopping.listCleared'))
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ paddingBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('shopping.title')}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {shoppingItems.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 20,
                  padding: '8px 14px',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🗑 {t('shopping.clearList')}
              </button>
            )}
          </div>
        </div>
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 6 }}>
          {shoppingItems.length} {t('shopping.myList').toLowerCase()}
        </p>
      </div>

      <div style={{ marginTop: 16 }}>
        <ShoppingList onCheckout={handleCheckout} />
      </div>

      {/* Checkout modal */}
      <AnimatePresence>
        {checkoutTotal !== null && (
          <CheckoutModal
            total={checkoutTotal}
            onConfirm={handleConfirmCheckout}
            onCancel={() => setCheckoutTotal(null)}
          />
        )}
      </AnimatePresence>

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

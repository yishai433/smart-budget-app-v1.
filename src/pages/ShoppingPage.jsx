import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import ShoppingList from '../components/shopping/ShoppingList'
import { useApp } from '../contexts/AppContext'
import UserAvatar from '../components/UserAvatar'

function CheckoutModal({ total, onConfirm, onCancel }) {
  const { settings } = useApp()
  const cur = settings.currency
  const [addExpense, setAddExpense] = useState(true)
  const [saveTemplate, setSaveTemplate] = useState(false)

  const Toggle = ({ checked, onChange, label, sub }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--c-bg)', borderRadius: 'var(--r-md)', padding: '12px 14px',
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{sub}</div>}
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="toggle-track" />
        <div className="toggle-thumb" />
      </label>
    </div>
  )

  return (
    <>
      <motion.div className="sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
      <div className="sheet-viewport">
        <motion.div
          className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          <div className="sheet-handle" />
          <div className="sheet-body">
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🛍️</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>סיים קניה</h2>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--c-danger)', margin: '8px 0' }}>
                {cur}{total.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Toggle
                checked={addExpense}
                onChange={setAddExpense}
                label="הוסף להוצאות"
                sub={addExpense ? `תירשם הוצאה של ${cur}${total.toFixed(2)}` : 'לא תירשם הוצאה'}
              />
              <Toggle
                checked={saveTemplate}
                onChange={setSaveTemplate}
                label="שמור רשימה לפעם הבאה"
                sub="תוכל לטעון אותה שוב בקליק"
              />
            </div>
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary btn-full" onClick={() => onConfirm({ addExpense, saveTemplate })}>
                ✓ סיים קניה
              </button>
              <button className="btn btn-secondary btn-full" onClick={onCancel}>
                ביטול
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default function ShoppingPage() {
  const { t } = useTranslation()
  const { checkoutShopping, clearShoppingList, loadShoppingTemplate, shoppingItems, household } = useApp()
  const [checkoutTotal, setCheckoutTotal] = useState(null)
  const hasTemplate = !!(household?.shoppingTemplate?.length > 0 || localStorage.getItem('sb_shopping_template'))

  const showToast = (msg) => {
    window.dispatchEvent(new CustomEvent('sb-toast', { detail: msg }))
  }

  const handleCheckout = (total) => setCheckoutTotal(total)

  const handleConfirmCheckout = async ({ addExpense, saveTemplate }) => {
    await checkoutShopping(checkoutTotal, { addExpense, saveTemplate })
    setCheckoutTotal(null)
    showToast(saveTemplate ? '✅ הקניה הסתיימה ורשימה נשמרה' : '✅ הקניה הסתיימה')
  }

  const handleClear = async () => {
    await clearShoppingList()
    showToast(t('shopping.listCleared'))
  }

  const handleLoadTemplate = async () => {
    const loaded = await loadShoppingTemplate()
    showToast(loaded ? '📋 הרשימה השמורה נטענה' : 'אין רשימה שמורה')
  }

  return (
    <div className="page">
      <div className="page-header" style={{ paddingBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('shopping.title')}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {shoppingItems.length === 0 && hasTemplate && (
              <button
                onClick={handleLoadTemplate}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  borderRadius: 20, padding: '8px 14px',
                  color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                📋 טען רשימה
              </button>
            )}
            {shoppingItems.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  borderRadius: 20, padding: '8px 14px',
                  color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                🗑 {t('shopping.clearList')}
              </button>
            )}
            <UserAvatar />
          </div>
        </div>
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 6 }}>
          {shoppingItems.length} {t('shopping.myList').toLowerCase()}
        </p>
      </div>

      <div style={{ marginTop: 16 }}>
        <ShoppingList onCheckout={handleCheckout} />
      </div>

      <AnimatePresence>
        {checkoutTotal !== null && (
          <CheckoutModal
            total={checkoutTotal}
            onConfirm={handleConfirmCheckout}
            onCancel={() => setCheckoutTotal(null)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

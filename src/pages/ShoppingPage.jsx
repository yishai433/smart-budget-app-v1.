import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import ShoppingList from '../components/shopping/ShoppingList'
import { useApp } from '../contexts/AppContext'
import UserAvatar from '../components/UserAvatar'
import { ShoppingCart } from 'lucide-react'

function CheckoutToggle({ checked, onChange, label, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--c-bg)', borderRadius: 'var(--r-md)', padding: '10px 14px',
    }}>
      <div style={{ flex: 1, marginLeft: 12 }}>
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
}

function CheckoutModal({ total, onConfirm, onCancel }) {
  const { settings } = useApp()
  const cur = settings.currency
  const [addExpense, setAddExpense] = useState(true)
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [supermarket, setSupermarket] = useState('')

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
            {/* Title + amount */}
            <div style={{ textAlign: 'center', paddingBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>סיים קניה</h2>
              <div dir="ltr" style={{ fontSize: 32, fontWeight: 800, color: 'var(--c-danger)' }}>
                {cur}−{total.toFixed(2)}
              </div>
            </div>

            {/* Toggles first — visible before keyboard opens */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CheckoutToggle
                checked={addExpense}
                onChange={setAddExpense}
                label="הוסף להוצאות"
                sub={addExpense ? `תירשם הוצאה של ${cur}${total.toFixed(2)}${supermarket ? ` — ${supermarket}` : ''}` : 'לא תירשם הוצאה'}
              />
              <CheckoutToggle
                checked={saveTemplate}
                onChange={setSaveTemplate}
                label="שמור רשימה לפעם הבאה"
                sub="תוכל לטעון אותה שוב בקליק"
              />
            </div>

            {/* Supermarket input last — keyboard opens here, rest already visible above */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">🏪 באיזה סופר קנית?</label>
              <input
                className="input-field"
                placeholder="שם הסופר..."
                value={supermarket}
                onChange={e => setSupermarket(e.target.value)}
              />
            </div>
          </div>

          <div className="sheet-footer">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary btn-full" onClick={() => onConfirm({ addExpense, saveTemplate, supermarket })}>
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

  const handleConfirmCheckout = async ({ addExpense, saveTemplate, supermarket }) => {
    try {
      await checkoutShopping(checkoutTotal, { addExpense, saveTemplate, supermarket })
      setCheckoutTotal(null)
      showToast(saveTemplate ? '✅ הקניה הסתיימה ורשימה נשמרה' : '✅ הקניה הסתיימה')
    } catch (err) {
      console.error('checkout error', err)
      showToast('שגיאה בשמירת הקניה, נסה שוב')
    }
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
      <div className="page-header" style={{ paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{t('shopping.title')}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
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
        <p style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
          {shoppingItems.length} {t('shopping.myList').toLowerCase()}
        </p>

        {/* Load template button — inside header, below title */}
        {shoppingItems.length === 0 && hasTemplate && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleLoadTemplate}
            style={{
              marginTop: 12,
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 14, padding: '10px 16px',
              color: 'white', cursor: 'pointer', width: '100%',
            }}
          >
            <ShoppingCart size={18} strokeWidth={2} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>טען רשימה שמורה</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 1 }}>הרשימה האחרונה שלך מוכנה לטעינה</div>
            </div>
          </motion.button>
        )}
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

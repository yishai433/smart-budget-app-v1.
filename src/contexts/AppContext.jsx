import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { db, auth, storage } from '../firebase'
import {
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, setDoc, getDoc, getDocs, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import i18n from '../i18n'
import { buildAvatarUrl } from '../utils/avatar'

const AppContext = createContext(null)

const CATEGORIES = {
  income: [
    { id: 'salary',     emoji: '💼', color: '#34C759' },
    { id: 'freelance',  emoji: '💻', color: '#30D158' },
    { id: 'gift',       emoji: '🎁', color: '#FF9F0A' },
    { id: 'investment', emoji: '📈', color: '#0A84FF' },
    { id: 'other',      emoji: '💰', color: '#636366' },
  ],
  expense: [
    { id: 'housing',       emoji: '🏠', color: '#D98888' },
    { id: 'food',          emoji: '🍔', color: '#FF9F0A' },
    { id: 'shopping',      emoji: '🛒', color: '#30D158' },
    { id: 'transport',     emoji: '🚗', color: '#0A84FF' },
    { id: 'clothing',      emoji: '👕', color: '#BF5AF2' },
    { id: 'health',        emoji: '❤️', color: '#D96B6B' },
    { id: 'entertainment', emoji: '🎬', color: '#D96B80' },
    { id: 'education',     emoji: '📚', color: '#5AC8FA' },
    { id: 'tech',          emoji: '📱', color: '#32ADE6' },
    { id: 'other',         emoji: '📦', color: '#636366' },
  ]
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [household, setHousehold] = useState(null)
  const [activeHouseholdId, setActiveHouseholdId] = useState(null) // uid of the household owner
  const [transactions, setTransactions] = useState([])
  const [shoppingItems, setShoppingItems] = useState([])
  const [receipts, setReceipts] = useState([])
  const [settings, setSettings] = useState(() => {
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem('sb_settings') || '{}') } catch {}
    return {
      language: localStorage.getItem('sb_lang') || 'he',
      currency: '₪',
      notificationsEnabled: false,
      reminderTime: '20:00',
      reminderFrequency: 'daily',
      receiptsEnabled: false,
      ...saved,
    }
  })
  const [loading, setLoading] = useState(true)
  const [avatarConfig, setAvatarConfig] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)

  // Auth init — wait for Firebase to restore session automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        await initHousehold(u.uid)
      } else {
        setUser(null)
        setHousehold(null)
        setTransactions([])
        setShoppingItems([])
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const initHousehold = async (uid) => {
    // Load profile (avatar + settings + linkedHouseholdId)
    let linkedId = null
    try {
      const profileSnap = await getDoc(doc(db, 'userProfiles', uid))
      if (profileSnap.exists()) {
        const data = profileSnap.data()
        if (data.avatarConfig) {
          setAvatarConfig(data.avatarConfig)
          setAvatarUrl(buildAvatarUrl(data.avatarConfig))
        }
        if (data.settings) {
          setSettings(s => {
            const merged = { ...s, ...data.settings }
            localStorage.setItem('sb_settings', JSON.stringify(merged))
            return merged
          })
        }
        // If user joined someone else's household, use their ID for all data
        if (data.linkedHouseholdId) linkedId = data.linkedHouseholdId
      }
      // Always keep displayName + email in profile so other members can see them
      const u = auth.currentUser
      if (u) {
        setDoc(doc(db, 'userProfiles', uid), {
          displayName: u.displayName || '',
          email: u.email || '',
        }, { merge: true }).catch(() => {})
      }
    } catch (e) {
      console.error('profile load error', e)
    }

    // Validate existing linkedId: the target household must exist and contain our uid,
    // and we must NOT be the owner (that would mean we're pointing to our own data).
    if (linkedId) {
      try {
        const snap = await getDoc(doc(db, 'households', linkedId))
        const data = snap.exists() ? snap.data() : null
        const valid = data && data.owner !== uid && Array.isArray(data.members) && data.members.includes(uid)
        if (!valid) {
          linkedId = null
          setDoc(doc(db, 'userProfiles', uid), { linkedHouseholdId: null }, { merge: true }).catch(() => {})
        }
      } catch { linkedId = null }
    }

    // If still no linkedId, scan for a household owned by someone else that has us as member
    if (!linkedId) {
      try {
        const memberQ = query(collection(db, 'households'), where('members', 'array-contains', uid))
        const memberSnap = await getDocs(memberQ)
        // Only pick a household we do NOT own (owner !== uid) and whose doc id isn't ours
        const foreign = memberSnap.docs.find(d => d.id !== uid && d.data().owner !== uid)
        if (foreign) {
          linkedId = foreign.id
          setDoc(doc(db, 'userProfiles', uid), { linkedHouseholdId: linkedId }, { merge: true }).catch(() => {})
        }
      } catch {}
    }

    // The "active" household is either the one they joined or their own
    const hhOwnerId = linkedId || uid
    setActiveHouseholdId(hhOwnerId)

    // Load the household document (may be someone else's)
    const hhRef = doc(db, 'households', hhOwnerId)
    const snap = await getDoc(hhRef)
    if (!snap.exists() && hhOwnerId === uid) {
      // Create own household if it doesn't exist yet
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      await setDoc(hhRef, {
        owner: uid,
        members: [uid],
        inviteCode: code,
        createdAt: serverTimestamp(),
      })
      setHousehold({ id: uid, owner: uid, members: [uid], inviteCode: code })
    } else if (snap.exists()) {
      const hhData = snap.data()
      setHousehold({ id: hhOwnerId, ...hhData })
      if (hhData.settings) {
        setSettings(s => {
          const merged = { ...s, ...hhData.settings }
          localStorage.setItem('sb_settings', JSON.stringify(merged))
          return merged
        })
      }
    }

    // Also ensure user's own household exists (for their invite code)
    if (hhOwnerId !== uid) {
      const ownRef = doc(db, 'households', uid)
      const ownSnap = await getDoc(ownRef)
      if (!ownSnap.exists()) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
        await setDoc(ownRef, { owner: uid, members: [uid], inviteCode: code, createdAt: serverTimestamp() })
      }
    }

    // Auto-join if there's a pending invite from a shared link
    const pendingCode = localStorage.getItem('sb_pending_invite')
    if (pendingCode) {
      localStorage.removeItem('sb_pending_invite')
      await applyInviteCode(uid, pendingCode)
    }

    setLoading(false)
  }

  const applyInviteCode = async (uid, code) => {
    try {
      const q = query(collection(db, 'households'), where('inviteCode', '==', code.toUpperCase()))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const hhDoc = snap.docs[0]
        if (hhDoc.id !== uid) { // don't join own household
          await updateDoc(doc(db, 'households', hhDoc.id), {
            members: arrayUnion(uid)
          })
        }
      }
    } catch (e) {
      console.error('invite join error', e)
    }
  }

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const [dbError, setDbError] = useState('')

  // Real-time transactions listener
  useEffect(() => {
    if (!user || !activeHouseholdId) return
    const q = query(
      collection(db, 'transactions'),
      where('householdId', '==', activeHouseholdId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort client-side — no index needed
      txs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      setTransactions(txs)
      setDbError('')
    }, (err) => {
      console.error('Firestore transactions error:', err.code, err.message)
      setDbError(err.code)
    })
    return unsub
  }, [user])

  // Real-time shopping items listener
  useEffect(() => {
    if (!user || !activeHouseholdId) return
    const q = query(
      collection(db, 'shoppingItems'),
      where('householdId', '==', activeHouseholdId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0
        const tb = b.createdAt?.seconds || 0
        return ta - tb
      })
      setShoppingItems(items)
    }, (err) => {
      console.error('Firestore shopping error:', err.code, err.message)
    })
    return unsub
  }, [user])

  const addTransaction = useCallback(async (data) => {
    if (!user || !activeHouseholdId) return
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...data,
        householdId: activeHouseholdId,
        createdAt: serverTimestamp(),
      })
      return docRef.id
    } catch (err) {
      console.error('addTransaction error:', err.code, err.message)
      throw err
    }
  }, [user, activeHouseholdId])

  const deleteTransaction = useCallback(async (id) => {
    await deleteDoc(doc(db, 'transactions', id))
  }, [])

  // Real-time receipts listener
  useEffect(() => {
    if (!user || !activeHouseholdId) return
    const q = query(collection(db, 'receipts'), where('householdId', '==', activeHouseholdId))
    const unsub = onSnapshot(q, (snap) => {
      const recs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      recs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      setReceipts(recs)
    }, (err) => {
      console.error('Firestore receipts error:', err.code, err.message)
    })
    return unsub
  }, [user])

  const addReceipt = useCallback(async (data) => {
    if (!user || !activeHouseholdId) return
    const docRef = await addDoc(collection(db, 'receipts'), {
      ...data,
      householdId: activeHouseholdId,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  }, [user, activeHouseholdId])

  const deleteReceipt = useCallback(async (id, storagePath) => {
    await deleteDoc(doc(db, 'receipts', id))
    if (storagePath) {
      try { await deleteObject(ref(storage, storagePath)) } catch (e) {}
    }
  }, [])

  const addShoppingItem = useCallback(async (data) => {
    if (!user || !activeHouseholdId) return
    await addDoc(collection(db, 'shoppingItems'), {
      ...data,
      householdId: activeHouseholdId,
      checked: false,
      createdAt: serverTimestamp(),
    })
  }, [user, activeHouseholdId])

  const updateShoppingItem = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'shoppingItems', id), data)
  }, [])

  const deleteShoppingItem = useCallback(async (id) => {
    await deleteDoc(doc(db, 'shoppingItems', id))
  }, [])

  const clearShoppingList = useCallback(async () => {
    await Promise.all(shoppingItems.map(i => deleteDoc(doc(db, 'shoppingItems', i.id))))
  }, [shoppingItems])

  const checkoutShopping = useCallback(async (total, { addExpense = true, saveTemplate = false } = {}) => {
    if (saveTemplate) {
      const template = shoppingItems.map(({ name, category, quantity, estimatedPrice, otherLabel }) =>
        ({ name, category, quantity: quantity || 1, estimatedPrice: estimatedPrice || 0, otherLabel: otherLabel || '' })
      )
      localStorage.setItem('sb_shopping_template', JSON.stringify(template))
    }
    if (addExpense && total > 0) {
      await addTransaction({
        type: 'expense',
        category: 'shopping',
        amount: total,
        description: i18n.t('shopping.title'),
        date: new Date().toISOString().split('T')[0],
        isRecurring: false,
      })
    }
    await clearShoppingList()
  }, [addTransaction, clearShoppingList, shoppingItems])

  const loadShoppingTemplate = useCallback(async () => {
    const raw = localStorage.getItem('sb_shopping_template')
    if (!raw) return false
    const template = JSON.parse(raw)
    await Promise.all(template.map(item => addShoppingItem(item)))
    return true
  }, [addShoppingItem])

  const saveAvatar = useCallback(async (config) => {
    if (!user) return
    await setDoc(doc(db, 'userProfiles', user.uid), { avatarConfig: config }, { merge: true })
    setAvatarConfig(config)
    setAvatarUrl(buildAvatarUrl(config))
  }, [user])

  const changeLanguage = useCallback((lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('sb_lang', lang)
    setSettings(s => ({ ...s, language: lang }))
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [])

  const updateSettings = useCallback((patch) => {
    setSettings(s => {
      const next = { ...s, ...patch }
      localStorage.setItem('sb_settings', JSON.stringify(next))
      return next
    })
    // Save to both Firestore collections for maximum reliability
    if (user) {
      const uid = user.uid
      updateDoc(doc(db, 'households', uid), { settings: patch })
        .catch(() =>
          setDoc(doc(db, 'households', uid), { settings: patch }, { merge: true })
        )
      setDoc(doc(db, 'userProfiles', uid), { settings: patch }, { merge: true })
        .catch(e => console.error('settings save error', e))
    }
  }, [user])

  // Derived stats for current month
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTransactions = transactions.filter(t => t.date?.startsWith(monthKey))
  const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const balance = totalIncome - totalExpenses

  const value = {
    user, household, activeHouseholdId, loading, settings,
    avatarConfig, avatarUrl, saveAvatar,
    transactions, monthTransactions,
    totalIncome, totalExpenses, balance,
    shoppingItems, CATEGORIES,
    receipts, addReceipt, deleteReceipt,
    addTransaction, deleteTransaction,
    addShoppingItem, updateShoppingItem, deleteShoppingItem,
    clearShoppingList, checkoutShopping, loadShoppingTemplate,
    changeLanguage, updateSettings, logout,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

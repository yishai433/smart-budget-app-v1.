import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { db, auth, storage } from '../firebase'
import {
  collection, doc, onSnapshot, addDoc as fsAddDoc, updateDoc as fsUpdateDoc, deleteDoc as fsDeleteDoc,
  query, where, orderBy, setDoc as fsSetDoc, getDoc, getDocs, serverTimestamp, arrayUnion, deleteField, increment
} from 'firebase/firestore'

// Offline: Firestore applies a write locally right away, but its promise only
// settles once the server confirms. While offline we don't wait for that, so
// saving never hangs; the write is queued and synced when the connection returns.
const offlineSafe = (fn) => (...args) => {
  const p = fn(...args)
  if (typeof navigator === 'undefined' || navigator.onLine) return p
  p.catch(e => console.error('queued write failed:', e?.code, e?.message))
  return Promise.resolve()
}
const updateDoc = offlineSafe(fsUpdateDoc)
const deleteDoc = offlineSafe(fsDeleteDoc)
const setDoc = offlineSafe(fsSetDoc)
// addDoc with an id made on the device, so the caller gets the reference offline too
const addDoc = (col, data) => {
  const ref = doc(col)
  return setDoc(ref, data).then(() => ref)
}
import { ref, deleteObject } from 'firebase/storage'
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import i18n from '../i18n'
import { buildAvatarUrl } from '../utils/avatar'
import { guessShoppingCategory } from '../utils/guessCategory'
import { getDueRecurring } from '../utils/recurring'
import { redeemInviteCode } from '../utils/invites'

const AppContext = createContext(null)

const CATEGORIES = {
  income: [
    { id: 'salary',     emoji: '💼', color: '#5E8B6E' },
    { id: 'freelance',  emoji: '💻', color: '#8FB79C' },
    { id: 'gift',       emoji: '🎁', color: '#E0B74E' },
    { id: 'investment', emoji: '📈', color: '#7FA3B8' },
    { id: 'other',      emoji: '💰', color: '#A7ADA6' },
  ],
  expense: [
    { id: 'housing',       emoji: '🏠', color: '#7FA08C' },
    { id: 'food',          emoji: '🍔', color: '#E0B74E' },
    { id: 'transport',     emoji: '🚗', color: '#7FA3B8' },
    { id: 'clothing',      emoji: '👕', color: '#B79AC0' },
    { id: 'health',        emoji: '❤️', color: '#D98C82' },
    { id: 'education',     emoji: '📚', color: '#8FA7C9' },
    { id: 'entertainment', emoji: '🎬', color: '#E0A07A' },
    { id: 'subscriptions', emoji: '📡', color: '#A397C9' },
    { id: 'outings',       emoji: '🎉', color: '#A8BF7E' },
    { id: 'grooming',      emoji: '💆', color: '#E3A9B8' },
    { id: 'tech',          emoji: '📱', color: '#6FA5A5' },
    { id: 'other',         emoji: '📦', color: '#A7ADA6' },
  ]
}

// Pro subscription allowlist — receipt scanning is gated to these accounts.
// Household members of an allowlisted owner get Pro too (partner access).
// Empty for now: receipts is shelved and shows as a locked Pro feature for
// everyone. Add emails here to re-enable.
const PRO_EMAILS = []

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [household, setHousehold] = useState(null)
  const [activeHouseholdId, setActiveHouseholdId] = useState(null) // uid of the household owner
  const [isPro, setIsPro] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [shoppingItems, setShoppingItems] = useState([])
  const [laterItems, setLaterItems] = useState([])
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
  const [partnerProfile, setPartnerProfile] = useState(null) // { uid, displayName, avatarUrl }

  // Auth init — wait for Firebase to restore session automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        setActiveHouseholdId(u.uid) // set immediately so queries/mutations work right away
        await initHousehold(u.uid)  // may update to linkedHouseholdId later
      } else {
        setUser(null)
        setHousehold(null)
        setActiveHouseholdId(null)
        setIsPro(false)
        setPartnerProfile(null)
        setTransactions([])
        setShoppingItems([])
        setLaterItems([])
        setReceipts([])
        setAvatarConfig(null)
        setAvatarUrl(null)
        setLoading(false)
      }
    })
    return unsub
  }, [])

  // Pro gate: allowlisted email, or member of an allowlisted owner's household
  useEffect(() => {
    if (!user) { setIsPro(false); return }
    if (PRO_EMAILS.includes(user.email?.toLowerCase())) { setIsPro(true); return }
    if (!activeHouseholdId || activeHouseholdId === user.uid) { setIsPro(false); return }
    let cancelled = false
    getDoc(doc(db, 'userProfiles', activeHouseholdId))
      .then(snap => {
        if (cancelled) return
        const ownerEmail = snap.exists() ? snap.data().email?.toLowerCase() : null
        setIsPro(PRO_EMAILS.includes(ownerEmail))
      })
      .catch(() => { if (!cancelled) setIsPro(false) })
    return () => { cancelled = true }
  }, [user, activeHouseholdId])

  const initHousehold = async (uid) => {
    // Start fetching the household we used last time in parallel with the profile:
    // saves one network round-trip on most opens (verified against the profile below).
    const cachedHh = localStorage.getItem(`sb_hh_${uid}`)
    const hhPrefetch = cachedHh ? getDoc(doc(db, 'households', cachedHh)).catch(() => null) : null
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
    localStorage.setItem(`sb_hh_${uid}`, hhOwnerId)
    const hhRef = doc(db, 'households', hhOwnerId)
    const prefetched = hhPrefetch && cachedHh === hhOwnerId ? await hhPrefetch : null
    const snap = prefetched || await getDoc(hhRef)
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
      // Load partner's profile (avatar + name) for display
      const partnerUid = (hhData.members || []).find(m => m !== uid)
      if (partnerUid) {
        getDoc(doc(db, 'userProfiles', partnerUid)).then(pSnap => {
          if (pSnap.exists()) {
            const pd = pSnap.data()
            setPartnerProfile({
              uid: partnerUid,
              displayName: pd.displayName || pd.email?.split('@')[0] || '',
              avatarUrl: pd.avatarConfig ? buildAvatarUrl(pd.avatarConfig) : null,
            })
          } else {
            setPartnerProfile({ uid: partnerUid, displayName: '', avatarUrl: null })
          }
        }).catch(() => {})
      } else {
        setPartnerProfile(null)
      }
    }

    // Also ensure user's own household exists (for their invite code)
    if (hhOwnerId !== uid) {
      // not needed to show the app, so it runs in the background
      const ownRef = doc(db, 'households', uid)
      getDoc(ownRef).then(ownSnap => {
        if (!ownSnap.exists()) {
          const code = Math.random().toString(36).substring(2, 8).toUpperCase()
          return setDoc(ownRef, { owner: uid, members: [uid], inviteCode: code, createdAt: serverTimestamp() })
        }
      }).catch(e => console.error('own household check error', e))
    }

    // Auto-join if there's a pending invite from a shared link
    const pendingCode = localStorage.getItem('sb_pending_invite')
    if (pendingCode) {
      localStorage.removeItem('sb_pending_invite')
      await applyInviteCode(uid, pendingCode)
    }

    setLoading(false)
  }

  // Invite that arrived through a shared link before sign-in
  const applyInviteCode = async (uid, code) => {
    try {
      const result = await redeemInviteCode(code, uid, null)
      if (result === 'ok') window.location.reload()
    } catch (e) {
      console.error('invite join error', e)
    }
  }

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const [dbError, setDbError] = useState('')

  // Live household document, so changes other members make (activity log,
  // budgets, goals) arrive without reopening the app. Starts only after the
  // initial load has settled on the right household.
  useEffect(() => {
    if (!user || !activeHouseholdId || loading) return
    const unsub = onSnapshot(doc(db, 'households', activeHouseholdId), (snap) => {
      if (snap.exists()) setHousehold({ id: activeHouseholdId, ...snap.data() })
    }, (err) => console.error('household listener error:', err.code, err.message))
    return unsub
  }, [user, activeHouseholdId, loading])

  // Real-time transactions listener
  useEffect(() => {
    if (!user || !activeHouseholdId) return
    const q = query(
      collection(db, 'transactions'),
      where('householdId', '==', activeHouseholdId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      txs.sort((a, b) => {
        const dateCmp = (b.date || '').localeCompare(a.date || '')
        if (dateCmp !== 0) return dateCmp
        // Same day: most recently added first (descending by creation time)
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      })
      setTransactions(txs)
      setDbError('')
    }, (err) => {
      console.error('Firestore transactions error:', err.code, err.message)
      setDbError(err.code)
    })
    return unsub
  }, [user, activeHouseholdId])

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
  }, [user, activeHouseholdId])

  // Real-time "later list" listener — a lightweight wishlist separate from
  // the active shopping cart, so users can jot down items to buy eventually.
  useEffect(() => {
    if (!user || !activeHouseholdId) return
    const q = query(
      collection(db, 'laterListItems'),
      where('householdId', '==', activeHouseholdId)
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      setLaterItems(items)
    }, (err) => {
      console.error('Firestore later-list error:', err.code, err.message)
    })
    return unsub
  }, [user, activeHouseholdId])

  const addLaterItem = useCallback(async (name) => {
    if (!user || !activeHouseholdId || !name.trim()) return
    await addDoc(collection(db, 'laterListItems'), {
      name: name.trim(),
      category: guessShoppingCategory(name),
      householdId: activeHouseholdId,
      createdAt: serverTimestamp(),
    })
  }, [user, activeHouseholdId])

  const deleteLaterItem = useCallback(async (id) => {
    await deleteDoc(doc(db, 'laterListItems', id))
  }, [])

  // Moves a later-list item into the active shopping cart, then removes it
  // from the later list. An optional per-category price can be passed in
  // (e.g. "5 ₪ for everything in produce") instead of leaving it at 0.
  const moveLaterItemToShopping = useCallback(async (item, price = 0) => {
    if (!user || !activeHouseholdId) return
    await addDoc(collection(db, 'shoppingItems'), {
      name: item.name,
      category: item.category,
      quantity: 1,
      estimatedPrice: price || 0,
      otherLabel: '',
      householdId: activeHouseholdId,
      checked: false,
      createdAt: serverTimestamp(),
    })
    await deleteDoc(doc(db, 'laterListItems', item.id))
  }, [user, activeHouseholdId])

  // Change log shared by the household: household.activity[id] = { kind, by, name, at, ... }.
  // Lives on the household doc (members may update it), kept for 30 days.
  const actorName = user?.displayName || user?.email?.split('@')[0] || ''
  const logActivity = useCallback(async (entry) => {
    if (!user || !activeHouseholdId) return
    try {
      const at = Date.now()
      const id = `${at.toString(36)}${Math.random().toString(36).slice(2, 5)}`
      const rec = { ...entry, at, by: user.uid, name: actorName, avatar: avatarUrl || null }
      const cutoff = at - 30 * 86400000
      const patch = { [`activity.${id}`]: rec }
      Object.entries(household?.activity || {}).forEach(([k, a]) => {
        if ((a.at || 0) < cutoff) patch[`activity.${k}`] = deleteField()
      })
      setHousehold(h => h && ({ ...h, activity: { ...(h.activity || {}), [id]: rec } }))
      const ref = doc(db, 'households', activeHouseholdId)
      try { await updateDoc(ref, patch) } catch { await setDoc(ref, { activity: { [id]: rec } }, { merge: true }) }
    } catch (err) {
      console.error('logActivity error:', err.code, err.message)
    }
  }, [user, activeHouseholdId, household, actorName, avatarUrl])

  const txSnap = (t) => ({
    type: t.type || 'expense', amount: t.amount || 0, category: t.category || 'other',
    description: t.description || '', date: t.date || '',
  })

  const addTransaction = useCallback(async (data) => {
    if (!user || !activeHouseholdId) return
    try {
      const split = household?.splitEnabled && data.type === 'expense' && (household.members || []).length > 1
        ? { paidBy: data.paidBy || user.uid, scope: data.scope || 'shared', splitAmong: data.splitAmong || household.members }
        : {}
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...data,
        ...split,
        householdId: activeHouseholdId,
        createdAt: serverTimestamp(),
      })
      logActivity({ kind: 'add', txId: docRef.id, after: txSnap(data) })
      return docRef.id
    } catch (err) {
      console.error('addTransaction error:', err.code, err.message)
      throw err
    }
  }, [user, activeHouseholdId, logActivity, household])

  // Put back a transaction that was just deleted (same id and data).
  const restoreTransaction = useCallback(async (tx) => {
    if (!activeHouseholdId || !tx?.id) return
    const { id, ...data } = tx
    await setDoc(doc(db, 'transactions', id), {
      ...data, householdId: activeHouseholdId, createdAt: data.createdAt || serverTimestamp(),
    })
    if (tx.autoGenerated) {
      // it was a booked recurring copy: let it count as booked again
      setHousehold(h => {
        if (!h?.recurringSkipped) return h
        const { [id]: _x, ...rest } = h.recurringSkipped
        return { ...h, recurringSkipped: rest }
      })
      updateDoc(doc(db, 'households', activeHouseholdId), { [`recurringSkipped.${id}`]: deleteField() }).catch(() => {})
    }
    logActivity({ kind: 'add', txId: id, after: txSnap(tx) })
  }, [activeHouseholdId, logActivity])

  const deleteTransaction = useCallback(async (id) => {
    // a booked recurring copy that is deleted on purpose must not be booked again
    const tx = transactions.find(t => t.id === id)
    if (tx?.autoGenerated && activeHouseholdId) {
      setHousehold(h => h && ({ ...h, recurringSkipped: { ...(h.recurringSkipped || {}), [id]: true } }))
      await setDoc(doc(db, 'households', activeHouseholdId), { recurringSkipped: { [id]: true } }, { merge: true })
    }
    await deleteDoc(doc(db, 'transactions', id))
    if (tx) {
      logActivity({ kind: 'delete', txId: id, before: txSnap(tx) })
      // offer to undo for a few seconds
      window.dispatchEvent(new CustomEvent('sb-toast', {
        detail: {
          message: settings.language === 'en' ? 'Transaction deleted' : 'העסקה נמחקה',
          actionLabel: settings.language === 'en' ? 'Undo' : 'ביטול',
          onAction: () => restoreTransaction(tx),
        },
      }))
    }
  }, [transactions, activeHouseholdId, logActivity, settings.language, restoreTransaction])

  const updateTransaction = useCallback(async (id, data) => {
    const before = transactions.find(t => t.id === id)
    await updateDoc(doc(db, 'transactions', id), data)
    if (before) {
      const b = txSnap(before)
      const a = txSnap({ ...before, ...data })
      if (Object.keys(a).some(k => a[k] !== b[k])) logActivity({ kind: 'edit', txId: id, before: b, after: a })
    }
  }, [transactions, logActivity])

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
  }, [user, activeHouseholdId])

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
    const { checked, ...rest } = data
    await addDoc(collection(db, 'shoppingItems'), {
      ...rest,
      householdId: activeHouseholdId,
      checked: checked !== undefined ? checked : true, // manual adds = already in cart
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

  const checkoutShopping = useCallback(async (total, { addExpense = true, supermarket = '' } = {}) => {
    // Always persist prices/quantities for next trip
    if (activeHouseholdId) {
      const template = shoppingItems.map(({ name, category, quantity, estimatedPrice, otherLabel }) =>
        ({ name, category, quantity: quantity || 1, estimatedPrice: estimatedPrice || 0, otherLabel: otherLabel || '' })
      )
      await updateDoc(doc(db, 'households', activeHouseholdId), { shoppingTemplate: template })
      localStorage.setItem('sb_shopping_template', JSON.stringify(template))
    }
    if (addExpense && total > 0) {
      await addTransaction({
        type: 'expense',
        category: 'food',
        amount: total,
        description: supermarket ? supermarket : i18n.t('shopping.title'),
        date: new Date().toISOString().split('T')[0],
        isRecurring: false,
        isShoppingTrip: true,
        items: shoppingItems.map(({ name, category, quantity, estimatedPrice, otherLabel }) => ({
          name, category, quantity: quantity || 1, estimatedPrice: estimatedPrice || 0, otherLabel: otherLabel || '',
        })),
      })
    }
    await clearShoppingList()
  }, [addTransaction, clearShoppingList, shoppingItems, activeHouseholdId])

  const loadShoppingTemplate = useCallback(async () => {
    let template = null
    // Try Firestore first (shared across devices)
    if (activeHouseholdId) {
      const hhSnap = await getDoc(doc(db, 'households', activeHouseholdId))
      if (hhSnap.exists() && hhSnap.data().shoppingTemplate?.length > 0) {
        template = hhSnap.data().shoppingTemplate
      }
    }
    // Fallback to localStorage
    if (!template) {
      const raw = localStorage.getItem('sb_shopping_template')
      if (!raw) return false
      try { template = JSON.parse(raw) } catch { return false }
    }
    if (!template?.length) return false
    await Promise.all(template.map(item => addShoppingItem({ ...item, checked: false })))
    return true
  }, [addShoppingItem, activeHouseholdId])

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

  // Month the user is currently viewing ("YYYY-MM"). Defaults to the real
  // current month; can be moved back with shiftMonth, never past today.
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey)
  const monthKey = selectedMonthKey
  const isCurrentMonth = monthKey === currentMonthKey

  const shiftMonth = useCallback((delta) => {
    setSelectedMonthKey(prev => {
      const [y, m] = prev.split('-').map(Number)
      const d = new Date(y, m - 1 + delta, 1)
      const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return next > currentMonthKey ? prev : next
    })
  }, [currentMonthKey])

  const goToCurrentMonth = useCallback(() => setSelectedMonthKey(currentMonthKey), [currentMonthKey])

  // Derived stats for the viewed month
  const monthTransactions = transactions.filter(t => t.date?.startsWith(monthKey))
  const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
  const totalExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const balance = totalIncome - totalExpenses

  // Shared household monthly budget — keyed by "YYYY-MM", editable from the
  // Budget tab prompt or Settings. Stored on the household doc so both
  // members see/set the same number.
  const monthlyBudget = household?.monthlyBudgets?.[monthKey] ?? null
  // Budget of the real current month, regardless of which month is being viewed
  // (Settings always edits this one).
  const currentMonthlyBudget = household?.monthlyBudgets?.[currentMonthKey] ?? null

  const setMonthlyBudget = useCallback(async (amount, key = monthKey) => {
    if (!activeHouseholdId) return
    const prevBudget = household?.monthlyBudgets?.[key] ?? null
    if (prevBudget !== amount) logActivity({ kind: 'budget', month: key, before: prevBudget, after: amount })
    setHousehold(h => h && ({ ...h, monthlyBudgets: { ...(h.monthlyBudgets || {}), [key]: amount } }))
    try {
      await updateDoc(doc(db, 'households', activeHouseholdId), { [`monthlyBudgets.${key}`]: amount })
    } catch {
      await setDoc(doc(db, 'households', activeHouseholdId), { monthlyBudgets: { [key]: amount } }, { merge: true })
    }
  }, [activeHouseholdId, monthKey, household, logActivity])

  // Per-category budgets. `categoryBudgets` is the default limit that applies
  // to every month; `categoryBudgetOverrides[monthKey][catId]` replaces it for
  // one month (a positive number = different limit, null = no limit that month).
  // Stored on the household doc so both members share them.
  const categoryBudgetOverridesForMonth = household?.categoryBudgetOverrides?.[monthKey] || {}
  const effectiveCategoryBudgets = {}
  Object.entries(household?.categoryBudgets || {}).forEach(([id, v]) => {
    if (v > 0) effectiveCategoryBudgets[id] = v
  })
  Object.entries(categoryBudgetOverridesForMonth).forEach(([id, v]) => {
    if (v > 0) effectiveCategoryBudgets[id] = v
    else if (v === null) delete effectiveCategoryBudgets[id]
  })
  const overriddenCategoryIds = Object.keys(categoryBudgetOverridesForMonth)

  // amount: positive number to set, null to remove.
  // onlyThisMonth: write to the viewed month's override instead of the default.
  const setCategoryBudget = useCallback(async (catId, amount, { onlyThisMonth = false } = {}) => {
    if (!activeHouseholdId) return
    const key = monthKey
    setHousehold(h => {
      if (!h) return h
      const budgets = { ...(h.categoryBudgets || {}) }
      const overrides = { ...(h.categoryBudgetOverrides || {}) }
      const monthOv = { ...(overrides[key] || {}) }
      if (onlyThisMonth) {
        monthOv[catId] = amount
      } else {
        if (amount > 0) budgets[catId] = amount
        else delete budgets[catId]
        delete monthOv[catId]
      }
      overrides[key] = monthOv
      return { ...h, categoryBudgets: budgets, categoryBudgetOverrides: overrides }
    })
    const ref = doc(db, 'households', activeHouseholdId)
    const ovPath = `categoryBudgetOverrides.${key}.${catId}`
    try {
      if (onlyThisMonth) {
        await updateDoc(ref, { [ovPath]: amount })
      } else {
        await updateDoc(ref, {
          [`categoryBudgets.${catId}`]: amount > 0 ? amount : deleteField(),
          [ovPath]: deleteField(),
        })
      }
    } catch {
      const nested = onlyThisMonth
        ? { categoryBudgetOverrides: { [key]: { [catId]: amount } } }
        : {
            categoryBudgets: { [catId]: amount > 0 ? amount : deleteField() },
            categoryBudgetOverrides: { [key]: { [catId]: deleteField() } },
          }
      await setDoc(ref, nested, { merge: true })
    }
  }, [activeHouseholdId, monthKey])

  // Savings goals, stored as a map on the household doc so both members share
  // them: savingsGoals[goalId] = { name, target, saved, date ("YYYY-MM" or ""), color, createdAt }.
  // Deposits use increment() so two people depositing at once never overwrite each other.
  // Deposits to a goal are NOT transactions: they don't affect the budget or the totals.
  const GOAL_COLORS = ['#4F7A8A', '#56633F', '#A8553A', '#9A6B8E', '#D08A2E', '#3F6F73']
  const savingsGoals = Object.entries(household?.savingsGoals || {})
    .map(([id, g]) => ({ id, ...g }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))

  const addSavingsGoal = useCallback(async ({ name, target, date = '' }) => {
    if (!activeHouseholdId) return
    const id = `g${Date.now().toString(36)}`
    const goal = {
      name, target, saved: 0, date,
      color: GOAL_COLORS[Object.keys(household?.savingsGoals || {}).length % GOAL_COLORS.length],
      createdAt: Date.now(),
    }
    logActivity({ kind: 'goalAdd', goal: { name, target } })
    setHousehold(h => h && ({ ...h, savingsGoals: { ...(h.savingsGoals || {}), [id]: goal } }))
    const ref = doc(db, 'households', activeHouseholdId)
    try {
      await updateDoc(ref, { [`savingsGoals.${id}`]: goal })
    } catch {
      await setDoc(ref, { savingsGoals: { [id]: goal } }, { merge: true })
    }
  }, [activeHouseholdId, household, logActivity])

  // delta > 0 deposits, delta < 0 withdraws (never below zero)
  const addToSavingsGoal = useCallback(async (id, delta) => {
    if (!activeHouseholdId) return
    const current = household?.savingsGoals?.[id]?.saved || 0
    const safeDelta = Math.max(delta, -current)
    if (!safeDelta) return
    logActivity({ kind: 'goalDeposit', goal: { name: household?.savingsGoals?.[id]?.name || '' }, delta: safeDelta })
    setHousehold(h => {
      const g = h?.savingsGoals?.[id]
      if (!g) return h
      return { ...h, savingsGoals: { ...h.savingsGoals, [id]: { ...g, saved: Math.max(0, (g.saved || 0) + safeDelta) } } }
    })
    await updateDoc(doc(db, 'households', activeHouseholdId), { [`savingsGoals.${id}.saved`]: increment(safeDelta) })
  }, [activeHouseholdId, household, logActivity])

  const deleteSavingsGoal = useCallback(async (id) => {
    if (!activeHouseholdId) return
    logActivity({ kind: 'goalDelete', goal: { name: household?.savingsGoals?.[id]?.name || '' } })
    setHousehold(h => {
      if (!h?.savingsGoals) return h
      const { [id]: _removed, ...rest } = h.savingsGoals
      return { ...h, savingsGoals: rest }
    })
    await updateDoc(doc(db, 'households', activeHouseholdId), { [`savingsGoals.${id}`]: deleteField() })
  }, [activeHouseholdId, household, logActivity])

  // Everyone in the household (name + avatar), for 2 or more members.
  const [members, setMembers] = useState([])
  const memberKey = (household?.members || []).join(',')
  useEffect(() => {
    const uids = household?.members || []
    if (!user || uids.length === 0) { setMembers([]); return }
    let cancelled = false
    Promise.all(uids.map(async uid => {
      try {
        const snap = await getDoc(doc(db, 'userProfiles', uid))
        const d = snap.exists() ? snap.data() : {}
        const name = d.displayName || d.email?.split('@')[0] || ''
        return { uid, name, firstName: name.trim().split(/\s+/)[0] || '', avatarUrl: d.avatarConfig ? buildAvatarUrl(d.avatarConfig) : null }
      } catch { return { uid, name: '', firstName: '', avatarUrl: null } }
    })).then(list => { if (!cancelled) setMembers(list) })
    return () => { cancelled = true }
  }, [user, memberKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Expense splitting ("who paid, who owes whom"), off unless the household turns it on.
  const splitEnabled = !!household?.splitEnabled && (household?.members || []).length > 1
  const setSplitEnabled = useCallback(async (on) => {
    if (!activeHouseholdId) return
    setHousehold(h => h && ({ ...h, splitEnabled: on }))
    await setDoc(doc(db, 'households', activeHouseholdId), { splitEnabled: on }, { merge: true })
  }, [activeHouseholdId])
  const settlements = Object.entries(household?.settlements || {}).map(([id, v]) => ({ id, ...v }))
  const addSettlement = useCallback(async ({ from, to, amount }) => {
    if (!activeHouseholdId || !from || !to || !(amount > 0)) return
    const id = `s${Date.now().toString(36)}`
    const rec = { from, to, amount, at: Date.now() }
    setHousehold(h => h && ({ ...h, settlements: { ...(h.settlements || {}), [id]: rec } }))
    await setDoc(doc(db, 'households', activeHouseholdId), { settlements: { [id]: rec } }, { merge: true })
    logActivity({ kind: 'settle', from, to, amount })
  }, [activeHouseholdId, logActivity])

  // Recurring expenses: book occurrences whose date has arrived. Runs when the
  // app opens (no server). Off switch and stopped series live on the household doc.
  const recurringOff = !!household?.recurringOff
  const recurringStopped = household?.recurringStopped || {}
  const recurringSkipped = household?.recurringSkipped || {}
  const [txLoaded, setTxLoaded] = useState(false)
  const bookedRef = useRef(new Set())
  useEffect(() => { setTxLoaded(false); bookedRef.current = new Set() }, [activeHouseholdId])
  useEffect(() => { if (activeHouseholdId && transactions.length > 0) setTxLoaded(true) }, [activeHouseholdId, transactions])
  useEffect(() => {
    if (!user || !activeHouseholdId || !household || recurringOff || !txLoaded) return
    const due = getDueRecurring(transactions, new Date(), { stopped: recurringStopped, skipped: recurringSkipped })
    due.forEach(({ id, data }) => {
      if (bookedRef.current.has(id)) return
      bookedRef.current.add(id)
      setDoc(doc(db, 'transactions', id), { ...data, householdId: activeHouseholdId, createdAt: serverTimestamp() })
        .catch(err => { bookedRef.current.delete(id); console.error('auto recurring error:', err.code, err.message) })
    })
  }, [user, activeHouseholdId, household, recurringOff, txLoaded, transactions])

  const setRecurringOff = useCallback(async (off) => {
    if (!activeHouseholdId) return
    setHousehold(h => h && ({ ...h, recurringOff: off }))
    await setDoc(doc(db, 'households', activeHouseholdId), { recurringOff: off }, { merge: true })
  }, [activeHouseholdId])

  const setRecurringStopped = useCallback(async (hash, stopped) => {
    if (!activeHouseholdId) return
    setHousehold(h => {
      if (!h) return h
      const { [hash]: _x, ...rest } = h.recurringStopped || {}
      return { ...h, recurringStopped: stopped ? { ...rest, [hash]: true } : rest }
    })
    await updateDoc(doc(db, 'households', activeHouseholdId), { [`recurringStopped.${hash}`]: stopped ? true : deleteField() })
      .catch(() => setDoc(doc(db, 'households', activeHouseholdId), { recurringStopped: { [hash]: stopped ? true : deleteField() } }, { merge: true }))
  }, [activeHouseholdId])

  // "What's new": changes by other members since this user last dismissed the card.
  const myUid = user?.uid
  const activitySeenAt = household?.activitySeen?.[myUid]
  const markActivitySeen = useCallback(async () => {
    if (!activeHouseholdId || !myUid) return
    const at = Date.now()
    setHousehold(h => h && ({ ...h, activitySeen: { ...(h.activitySeen || {}), [myUid]: at } }))
    const ref = doc(db, 'households', activeHouseholdId)
    try { await updateDoc(ref, { [`activitySeen.${myUid}`]: at }) }
    catch { await setDoc(ref, { activitySeen: { [myUid]: at } }, { merge: true }) }
  }, [activeHouseholdId, myUid])
  // first time on this account: start counting from now instead of dumping history
  useEffect(() => {
    if (!loading && household && myUid && activitySeenAt === undefined) markActivitySeen()
  }, [loading, household, myUid, activitySeenAt, markActivitySeen])
  const unseenActivity = Object.entries(household?.activity || {})
    .map(([id, a]) => ({ id, ...a }))
    .filter(a => a.by !== myUid && (a.at || 0) > (activitySeenAt ?? Infinity))
    .sort((a, b) => b.at - a.at)
  const activityAll = Object.entries(household?.activity || {})
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => b.at - a.at)

  const value = {
    user, household, activeHouseholdId, loading, settings, isPro,
    avatarConfig, avatarUrl, saveAvatar, partnerProfile,
    transactions, monthTransactions,
    totalIncome, totalExpenses, balance, monthKey,
    currentMonthKey, isCurrentMonth, shiftMonth, goToCurrentMonth,
    monthlyBudget, currentMonthlyBudget, setMonthlyBudget,
    effectiveCategoryBudgets, overriddenCategoryIds, setCategoryBudget,
    savingsGoals, addSavingsGoal, addToSavingsGoal, deleteSavingsGoal,
    recurringOff, recurringStopped, setRecurringOff, setRecurringStopped,
    unseenActivity, activityAll, markActivitySeen,
    members, splitEnabled, setSplitEnabled, settlements, addSettlement,
    shoppingItems, CATEGORIES,
    laterItems, addLaterItem, deleteLaterItem, moveLaterItemToShopping,
    receipts, addReceipt, deleteReceipt,
    addTransaction, deleteTransaction, updateTransaction,
    addShoppingItem, updateShoppingItem, deleteShoppingItem,
    clearShoppingList, checkoutShopping, loadShoppingTemplate,
    changeLanguage, updateSettings, logout,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

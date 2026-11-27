import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, increment, deleteField,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import { Household, Transaction, ShoppingItem, SavingsGoal, LaterItem, SavedBasket, BasketItem } from '../types'
import { guessShoppingCategory } from '../lib/shopCategories'
import { currentMonthKey, monthKeyOf, txMonth } from '../lib/month'
import { createInviteCode, redeemInviteCode, RedeemResult } from '../lib/invites'

const GOAL_COLORS = ['#c67139', '#7a8a5e', '#4F7A8A', '#9A6B8E', '#D08A2E', '#6B5FA0']
import { setDisplayCurrency } from '../lib/money'

interface DataValue {
  ready: boolean
  household: Household | null
  activeHouseholdId: string | null
  transactions: Transaction[]
  monthKey: string
  isCurrentMonth: boolean
  shiftMonth: (delta: number) => void
  goToCurrentMonth: () => void
  monthTransactions: Transaction[]
  totalIncome: number
  totalExpenses: number
  balance: number
  monthlyBudget: number | null
  effectiveCategoryBudgets: Record<string, number>
  setMonthlyBudget: (amount: number) => Promise<void>
  setCategoryBudget: (catId: string, amount: number) => Promise<void>
  addTransaction: (data: Omit<Transaction, 'id' | 'householdId'>) => Promise<void>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  shoppingItems: ShoppingItem[]
  addShoppingItem: (data: Partial<ShoppingItem> & { name: string }) => Promise<void>
  updateShoppingItem: (id: string, data: Partial<ShoppingItem>) => Promise<void>
  deleteShoppingItem: (id: string) => Promise<void>
  clearChecked: () => Promise<void>
  uid: string | null
  currency: string
  setCurrency: (cur: string) => Promise<void>
  savingsGoals: SavingsGoal[]
  addGoal: (name: string, target: number) => Promise<void>
  depositGoal: (id: string, delta: number) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  createInvite: () => Promise<{ code: string; expiresAt: Date }>
  joinByCode: (code: string) => Promise<RedeemResult>
  partnerName: string | null
  incomeMonthMode: IncomeMonthMode | null
  laterItems: LaterItem[]
  addLaterItem: (name: string) => Promise<void>
  deleteLaterItem: (id: string) => Promise<void>
  moveLaterToList: (items: LaterItem[]) => Promise<void>
  savedBaskets: SavedBasket[]
  lastTrip: BasketItem[]
  saveBasket: (name: string, items: BasketItem[], id?: string) => Promise<void>
  deleteBasket: (id: string) => Promise<void>
  loadBasket: (items: BasketItem[]) => Promise<number>
  clearShoppingList: () => Promise<void>
  checkoutShopping: (total: number, opts: { addExpense: boolean; supermarket: string; priceOf?: (i: ShoppingItem) => number }) => Promise<void>
  priceStores: string[]
  activeStore: string
  setActiveStore: (key: string) => Promise<void>
  setIncomeMonthMode: (m: IncomeMonthMode) => Promise<void>
}

// Where income received early in a month (days 1–15) is counted.
export type IncomeMonthMode = 'previous' | 'received'

const Ctx = createContext<DataValue>(null as unknown as DataValue)
export const useData = () => useContext(Ctx)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [laterItems, setLaterItems] = useState<LaterItem[]>([])
  const [ready, setReady] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey())
  const [resolveBump, setResolveBump] = useState(0)

  // Resolve which household to show: a joined one (linkedHouseholdId) or our own.
  useEffect(() => {
    if (!user) { setActiveHouseholdId(null); setHousehold(null); setTransactions([]); setReady(false); return }
    let cancelled = false
    ;(async () => {
      let ownerId = user.uid
      try {
        const profile = await getDoc(doc(db, 'userProfiles', user.uid))
        const linked = profile.exists() ? (profile.data() as { linkedHouseholdId?: string }).linkedHouseholdId : null
        if (linked) {
          const h = await getDoc(doc(db, 'households', linked))
          const d = h.exists() ? (h.data() as Household) : null
          if (d && d.owner !== user.uid && Array.isArray(d.members) && d.members.includes(user.uid)) ownerId = linked
        }
        // Make sure our own display name/email are stored for other members.
        await setDoc(doc(db, 'userProfiles', user.uid), { displayName: user.displayName || '', email: user.email || '' }, { merge: true })
      } catch { /* offline: fall back to own uid */ }
      if (cancelled) return
      // Create our own household on first run.
      if (ownerId === user.uid) {
        const ref = doc(db, 'households', user.uid)
        const snap = await getDoc(ref).catch(() => null)
        if (snap && !snap.exists()) {
          const code = Math.random().toString(36).slice(2, 8).toUpperCase()
          await setDoc(ref, { owner: user.uid, members: [user.uid], inviteCode: code, createdAt: serverTimestamp() }).catch(() => {})
        }
      }
      if (!cancelled) setActiveHouseholdId(ownerId)
    })()
    return () => { cancelled = true }
  }, [user, resolveBump])

  // Live household document.
  useEffect(() => {
    if (!activeHouseholdId) return
    return onSnapshot(doc(db, 'households', activeHouseholdId), (snap) => {
      if (snap.exists()) {
        const data = { id: activeHouseholdId, ...snap.data() } as Household
        setHousehold(data)
        setDisplayCurrency((data.settings?.currency as string) || '₪')
        const partnerUid = (data.members || []).find(m => m !== user?.uid)
        if (partnerUid) {
          getDoc(doc(db, 'userProfiles', partnerUid)).then(p => {
            const pd = p.exists() ? (p.data() as { displayName?: string; email?: string }) : null
            setPartnerName(pd?.displayName || pd?.email?.split('@')[0] || null)
          }).catch(() => {})
        } else setPartnerName(null)
      }
      setReady(true)
    }, () => setReady(true))
  }, [activeHouseholdId, user])

  // Live transactions.
  useEffect(() => {
    if (!activeHouseholdId) return
    const q = query(collection(db, 'transactions'), where('householdId', '==', activeHouseholdId))
    return onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]
      txs.sort((a, b) => (b.date || '').localeCompare(a.date || '') || ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      setTransactions(txs)
    }, () => {})
  }, [activeHouseholdId])

  // Live shopping items.
  useEffect(() => {
    if (!activeHouseholdId) return
    const q = query(collection(db, 'shoppingItems'), where('householdId', '==', activeHouseholdId))
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ShoppingItem[]
      items.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      setShoppingItems(items)
    }, () => {})
  }, [activeHouseholdId])

  // Live "later" list: things to buy some day, kept apart from the active list.
  useEffect(() => {
    if (!activeHouseholdId) return
    const q = query(collection(db, 'laterListItems'), where('householdId', '==', activeHouseholdId))
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LaterItem[]
      items.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      setLaterItems(items)
    }, () => {})
  }, [activeHouseholdId])

  const addShoppingItem: DataValue['addShoppingItem'] = async (data) => {
    if (!activeHouseholdId) return
    const { checked, ...rest } = data
    await addDoc(collection(db, 'shoppingItems'), { category: 'other', quantity: 1, ...rest, householdId: activeHouseholdId, checked: checked !== undefined ? checked : true, createdAt: serverTimestamp() })
  }
  const updateShoppingItem: DataValue['updateShoppingItem'] = async (id, data) => { await updateDoc(doc(db, 'shoppingItems', id), data) }
  const deleteShoppingItem: DataValue['deleteShoppingItem'] = async (id) => { await deleteDoc(doc(db, 'shoppingItems', id)) }
  const addLaterItem: DataValue['addLaterItem'] = async (name) => {
    const n = name.trim(); if (!activeHouseholdId || !n) return
    await addDoc(collection(db, 'laterListItems'), { name: n, category: guessShoppingCategory(n), householdId: activeHouseholdId, createdAt: serverTimestamp() })
  }
  const deleteLaterItem: DataValue['deleteLaterItem'] = async (id) => { await deleteDoc(doc(db, 'laterListItems', id)) }
  const moveLaterToList: DataValue['moveLaterToList'] = async (items) => {
    if (!activeHouseholdId) return
    await Promise.all(items.map(async it => {
      await addDoc(collection(db, 'shoppingItems'), { name: it.name, category: it.category || guessShoppingCategory(it.name), quantity: 1, estimatedPrice: 0, otherLabel: '', householdId: activeHouseholdId, checked: false, createdAt: serverTimestamp() })
      await deleteDoc(doc(db, 'laterListItems', it.id))
    }))
  }

  const savedBaskets: SavedBasket[] = Object.entries(household?.shoppingBaskets || {})
    .map(([id, b]) => ({ id, ...b })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  const lastTrip: BasketItem[] = household?.shoppingTemplate || []
  const clean = (items: BasketItem[]): BasketItem[] => items.map(({ name, category, quantity, estimatedPrice, code }) =>
    ({ name, category: category || guessShoppingCategory(name), quantity: quantity || 1, estimatedPrice: estimatedPrice || 0, ...(code ? { code } : {}) }))
  const saveBasket: DataValue['saveBasket'] = async (name, items, id) => {
    if (!activeHouseholdId) return
    const key = id || Math.random().toString(36).slice(2, 10)
    const b = { name: name.trim() || 'סל', items: clean(items), updatedAt: Date.now() }
    try { await updateDoc(doc(db, 'households', activeHouseholdId), { [`shoppingBaskets.${key}`]: b }) }
    catch { await setDoc(doc(db, 'households', activeHouseholdId), { shoppingBaskets: { [key]: b } }, { merge: true }) }
  }
  const deleteBasket: DataValue['deleteBasket'] = async (id) => {
    if (!activeHouseholdId) return
    await updateDoc(doc(db, 'households', activeHouseholdId), { [`shoppingBaskets.${id}`]: deleteField() })
  }
  // Adds a basket's items to the list as "to buy", skipping names already on the list.
  const loadBasket: DataValue['loadBasket'] = async (items) => {
    if (!activeHouseholdId) return 0
    const have = new Set(shoppingItems.map(i => i.name.trim()))
    const add = clean(items).filter(i => !have.has(i.name.trim()))
    await Promise.all(add.map(i => addDoc(collection(db, 'shoppingItems'), { ...i, otherLabel: '', householdId: activeHouseholdId, checked: false, createdAt: serverTimestamp() })))
    return add.length
  }
  const clearShoppingList: DataValue['clearShoppingList'] = async () => {
    await Promise.all(shoppingItems.map(i => deleteDoc(doc(db, 'shoppingItems', i.id))))
  }
  // Finish a trip: remember the list (and prices) for next time, optionally record the
  // expense with the items, then empty the list. Same data shape as the website.
  const checkoutShopping: DataValue['checkoutShopping'] = async (total, { addExpense, supermarket, priceOf }) => {
    if (!activeHouseholdId) return
    const priced = priceOf ? shoppingItems.map(i => ({ ...i, estimatedPrice: priceOf(i) })) : shoppingItems
    const template = clean(priced).map(i => ({ ...i, otherLabel: '' }))
    const jobs: Promise<unknown>[] = [updateDoc(doc(db, 'households', activeHouseholdId), { shoppingTemplate: template })]
    if (addExpense && total > 0 && user) {
      const d = new Date()
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      jobs.push(addDoc(collection(db, 'transactions'), {
        type: 'expense', category: 'food', amount: Math.round(total * 100) / 100, description: supermarket.trim() || 'קניות בסופר', date,
        isRecurring: false, isShoppingTrip: true, items: priced.filter(i => i.checked).length ? clean(priced.filter(i => i.checked)) : template,
        householdId: activeHouseholdId, createdBy: user.uid, createdByName: (user.displayName || '').split(' ')[0], createdAt: serverTimestamp(),
      }))
    }
    jobs.push(...shoppingItems.map(i => deleteDoc(doc(db, 'shoppingItems', i.id))))
    await Promise.all(jobs)
  }

  // Supermarket branches whose prices the home server keeps for this household, and the one we shop at now.
  const priceStores: string[] = household?.priceStores?.length ? household.priceStores : []
  const activeStore = (household?.settings?.shopStore as string) && priceStores.includes(household?.settings?.shopStore as string)
    ? (household?.settings?.shopStore as string) : (priceStores[0] || '')
  const setActiveStore: DataValue['setActiveStore'] = async (key) => {
    if (!activeHouseholdId) return
    const stores = priceStores.includes(key) ? priceStores : [...priceStores, key]
    await setDoc(doc(db, 'households', activeHouseholdId), { priceStores: stores, settings: { shopStore: key } }, { merge: true })
  }

  const clearChecked: DataValue['clearChecked'] = async () => { await Promise.all(shoppingItems.filter(i => i.checked).map(i => deleteDoc(doc(db, 'shoppingItems', i.id)))) }

  const monthKey = selectedMonth
  const curKey = currentMonthKey()
  const isCurrentMonth = monthKey === curKey
  const shiftMonth = (delta: number) => setSelectedMonth(prev => {
    const [y, m] = prev.split('-').map(Number)
    const next = monthKeyOf(new Date(y, m - 1 + delta, 1))
    return next > curKey ? prev : next     // never past the current month
  })
  const goToCurrentMonth = () => setSelectedMonth(curKey)

  const monthTransactions = useMemo(() => transactions.filter(t => txMonth(t) === monthKey), [transactions, monthKey])
  const totalIncome = useMemo(() => monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0), [monthTransactions])
  const totalExpenses = useMemo(() => monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0), [monthTransactions])
  const monthlyBudget = household?.monthlyBudgets?.[monthKey] ?? null
  const currency = (household?.settings?.currency as string) || '₪'

  const effectiveCategoryBudgets = useMemo(() => {
    const out: Record<string, number> = {}
    Object.entries(household?.categoryBudgets || {}).forEach(([id, v]) => { if (v > 0) out[id] = v })
    const over = household?.categoryBudgetOverrides?.[monthKey] || {}
    Object.entries(over).forEach(([id, v]) => { if (v > 0) out[id] = v as number; else if (v === null) delete out[id] })
    return out
  }, [household, monthKey])

  const savingsGoals: SavingsGoal[] = Object.entries(household?.savingsGoals || {}).map(([id, g]) => ({ id, ...g }))

  const addGoal: DataValue['addGoal'] = async (name, target) => {
    if (!activeHouseholdId) return
    const id = Math.random().toString(36).slice(2, 10)
    const color = GOAL_COLORS[savingsGoals.length % GOAL_COLORS.length]
    const goal = { name, target, saved: 0, date: '', color }
    try { await updateDoc(doc(db, 'households', activeHouseholdId), { [`savingsGoals.${id}`]: goal }) }
    catch { await setDoc(doc(db, 'households', activeHouseholdId), { savingsGoals: { [id]: goal } }, { merge: true }) }
  }
  const depositGoal: DataValue['depositGoal'] = async (id, delta) => {
    if (!activeHouseholdId) return
    await updateDoc(doc(db, 'households', activeHouseholdId), { [`savingsGoals.${id}.saved`]: increment(delta) })
  }
  const deleteGoal: DataValue['deleteGoal'] = async (id) => {
    if (!activeHouseholdId) return
    await updateDoc(doc(db, 'households', activeHouseholdId), { [`savingsGoals.${id}`]: deleteField() })
  }

  const createInvite: DataValue['createInvite'] = async () => {
    if (!user || !activeHouseholdId) throw new Error('no-household')
    return createInviteCode(activeHouseholdId, user.uid)
  }
  const joinByCode: DataValue['joinByCode'] = async (code) => {
    if (!user) return 'error'
    const res = await redeemInviteCode(code, user.uid, activeHouseholdId)
    if (res === 'ok') setResolveBump(n => n + 1)
    return res
  }

  const setCurrency = async (cur: string) => {
    if (!activeHouseholdId) return
    setDisplayCurrency(cur)
    try { await updateDoc(doc(db, 'households', activeHouseholdId), { 'settings.currency': cur }) }
    catch { await setDoc(doc(db, 'households', activeHouseholdId), { settings: { currency: cur } }, { merge: true }) }
  }

  const incomeMonthMode = (household?.settings?.incomeMonth as IncomeMonthMode) || null
  const setIncomeMonthMode = async (m: IncomeMonthMode) => {
    if (!activeHouseholdId) return
    try { await updateDoc(doc(db, 'households', activeHouseholdId), { 'settings.incomeMonth': m }) }
    catch { await setDoc(doc(db, 'households', activeHouseholdId), { settings: { incomeMonth: m } }, { merge: true }) }
  }

  const setCategoryBudget = async (catId: string, amount: number) => {
    if (!activeHouseholdId) return
    const ref = doc(db, 'households', activeHouseholdId)
    try { await updateDoc(ref, { [`categoryBudgets.${catId}`]: amount > 0 ? amount : deleteField() }) }
    catch { if (amount > 0) await setDoc(ref, { categoryBudgets: { [catId]: amount } }, { merge: true }) }
  }

  const setMonthlyBudget = async (amount: number) => {
    if (!activeHouseholdId) return
    try { await updateDoc(doc(db, 'households', activeHouseholdId), { [`monthlyBudgets.${monthKey}`]: amount }) }
    catch { await setDoc(doc(db, 'households', activeHouseholdId), { monthlyBudgets: { [monthKey]: amount } }, { merge: true }) }
  }

  const addTransaction: DataValue['addTransaction'] = async (data) => {
    if (!user || !activeHouseholdId) return
    await addDoc(collection(db, 'transactions'), {
      ...data, householdId: activeHouseholdId, createdBy: user.uid,
      createdByName: (user.displayName || '').split(' ')[0], createdAt: serverTimestamp(),
    })
  }
  const updateTransaction: DataValue['updateTransaction'] = async (id, data) => { await updateDoc(doc(db, 'transactions', id), data) }
  const deleteTransaction: DataValue['deleteTransaction'] = async (id) => { await deleteDoc(doc(db, 'transactions', id)) }

  const value: DataValue = {
    ready, household, activeHouseholdId, transactions, monthKey, isCurrentMonth, shiftMonth, goToCurrentMonth,
    monthTransactions, totalIncome, totalExpenses, balance: totalIncome - totalExpenses,
    monthlyBudget, effectiveCategoryBudgets, setMonthlyBudget, setCategoryBudget, addTransaction, updateTransaction, deleteTransaction,
    shoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem, clearChecked, uid: user?.uid ?? null, currency, setCurrency, savingsGoals, addGoal, depositGoal, deleteGoal, createInvite, joinByCode, partnerName, incomeMonthMode, setIncomeMonthMode,
    laterItems, addLaterItem, deleteLaterItem, moveLaterToList, savedBaskets, lastTrip, saveBasket, deleteBasket, loadBasket, clearShoppingList, checkoutShopping, priceStores, activeStore, setActiveStore,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

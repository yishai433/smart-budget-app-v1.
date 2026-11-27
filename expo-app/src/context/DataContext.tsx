import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, increment, deleteField,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import { Household, Transaction, ShoppingItem, SavingsGoal } from '../types'
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

  const addShoppingItem: DataValue['addShoppingItem'] = async (data) => {
    if (!activeHouseholdId) return
    const { checked, ...rest } = data
    await addDoc(collection(db, 'shoppingItems'), { category: 'other', quantity: 1, ...rest, householdId: activeHouseholdId, checked: checked !== undefined ? checked : true, createdAt: serverTimestamp() })
  }
  const updateShoppingItem: DataValue['updateShoppingItem'] = async (id, data) => { await updateDoc(doc(db, 'shoppingItems', id), data) }
  const deleteShoppingItem: DataValue['deleteShoppingItem'] = async (id) => { await deleteDoc(doc(db, 'shoppingItems', id)) }
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
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

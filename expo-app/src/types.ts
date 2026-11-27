export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  householdId: string
  type: TxType
  category: string
  amount: number
  description?: string
  date: string            // 'YYYY-MM-DD'
  createdBy?: string
  createdByName?: string
  createdAt?: { seconds: number } | null
  isRecurring?: boolean
  forMonth?: string        // 'YYYY-MM' the money belongs to (e.g. salary for last month); defaults to date's month
}

export interface Household {
  id: string
  owner: string
  members: string[]
  inviteCode?: string
  monthlyBudgets?: Record<string, number>
  categoryBudgets?: Record<string, number>
  categoryBudgetOverrides?: Record<string, Record<string, number>>
  savingsGoals?: Record<string, { name: string; target: number; saved: number; date?: string; color?: string }>
  priceStores?: string[]
  splitEnabled?: boolean
  settings?: Record<string, unknown>
}

export interface ShoppingItem {
  id: string
  householdId: string
  name: string
  category?: string
  quantity?: number
  estimatedPrice?: number
  otherLabel?: string
  barcode?: string
  checked?: boolean
  createdAt?: { seconds: number } | null
}

export interface SavingsGoal {
  id: string
  name: string
  target: number
  saved: number
  date?: string
  color?: string
}

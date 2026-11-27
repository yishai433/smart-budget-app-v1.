import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppearancePref = 'light' | 'dark' | 'auto'
const KEY = 'sb_appearance'
const SAVINGS_KEY = 'sb_show_savings'

// Look-and-feel choices kept on this phone: theme, and optional sections of the budget page.
interface Value { pref: AppearancePref; setPref: (p: AppearancePref) => void; showSavings: boolean; setShowSavings: (v: boolean) => void }
const Ctx = createContext<Value>({ pref: 'auto', setPref: () => {}, showSavings: false, setShowSavings: () => {} })
export const useAppearance = () => useContext(Ctx)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<AppearancePref>('auto')
  const [showSavings, setShowSavingsState] = useState(false)     // savings goals are off unless turned on in Settings
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark' || v === 'auto') setPrefState(v) })
    AsyncStorage.getItem(SAVINGS_KEY).then(v => setShowSavingsState(v === '1')).catch(() => {})
  }, [])
  const setPref = (p: AppearancePref) => { setPrefState(p); AsyncStorage.setItem(KEY, p).catch(() => {}) }
  const setShowSavings = (v: boolean) => { setShowSavingsState(v); AsyncStorage.setItem(SAVINGS_KEY, v ? '1' : '0').catch(() => {}) }
  return <Ctx.Provider value={{ pref, setPref, showSavings, setShowSavings }}>{children}</Ctx.Provider>
}

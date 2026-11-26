import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type AppearancePref = 'light' | 'dark' | 'auto'
const KEY = 'sb_appearance'

interface Value { pref: AppearancePref; setPref: (p: AppearancePref) => void }
const Ctx = createContext<Value>({ pref: 'auto', setPref: () => {} })
export const useAppearance = () => useContext(Ctx)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<AppearancePref>('auto')
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark' || v === 'auto') setPrefState(v) }) }, [])
  const setPref = (p: AppearancePref) => { setPrefState(p); AsyncStorage.setItem(KEY, p).catch(() => {}) }
  return <Ctx.Provider value={{ pref, setPref }}>{children}</Ctx.Provider>
}

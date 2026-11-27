import { useColorScheme } from 'react-native'
import { useAppearance } from './context/AppearanceContext'

export type Theme = typeof light

// "Ocean" palette — calm teal on a soft mint ground, light + dark.
export const light = {
  primary: '#0D9488', primaryDark: '#0A6E66', primaryLight: '#DCF1EE',
  accent2: '#2E9E5B', accent2Dark: '#2E9E5B', accent2Light: '#E0F3E7',
  danger: '#E05252', dangerLight: '#FBE4E4', success: '#2E9E5B', warning: '#C27A1E',
  bg: '#EFF8F7', card: '#FFFFFF', text: '#0C332F', text2: '#4C7873', text3: '#86A5A1',
  remaining: '#0D9488', border: 'rgba(12,51,47,0.11)', sep: 'rgba(12,51,47,0.07)',
  ink: '#0D9488', inkText: '#FFFFFF', inkText2: 'rgba(255,255,255,0.76)', inkLine: 'rgba(255,255,255,0.26)',
}
export const dark: typeof light = {
  ...light,
  primary: '#2DD4BF', primaryDark: '#0F766E', primaryLight: 'rgba(45,212,191,0.16)',
  accent2: '#4ADE80', accent2Dark: '#4ADE80', accent2Light: 'rgba(74,222,128,0.17)',
  danger: '#FB7185', dangerLight: 'rgba(251,113,133,0.18)', success: '#4ADE80', warning: '#E0A24F',
  bg: '#0C1A18', card: '#152926', text: '#E8F3F1', text2: '#9DBAB5', text3: '#6E8E89',
  remaining: '#2DD4BF', border: 'rgba(255,255,255,0.11)', sep: 'rgba(255,255,255,0.07)',
  ink: '#0E3B36', inkText: '#EAF7F4', inkText2: 'rgba(234,247,244,0.68)', inkLine: 'rgba(255,255,255,0.14)',
}
export const radius = { sm: 12, md: 16, lg: 20, xl: 28 }
export const useTheme = (): Theme => {
  const system = useColorScheme()
  const { pref } = useAppearance()
  const resolved = pref === 'auto' ? system : pref
  return resolved === 'dark' ? dark : light
}

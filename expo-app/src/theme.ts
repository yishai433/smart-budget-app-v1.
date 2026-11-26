import { useColorScheme } from 'react-native'
import { useAppearance } from './context/AppearanceContext'

export type Theme = typeof light

// Same palette as the website (src/index.css), light + dark.
export const light = {
  primary: '#c67139', primaryDark: '#8c491a', primaryLight: '#f7e4d3',
  accent2: '#7a8a5e', accent2Dark: '#56633f', accent2Light: '#eaf0e0',
  danger: '#D94949', dangerLight: '#fbe5e5', success: '#56633f', warning: '#b2622d',
  bg: '#f5ead8', card: '#ebddc5', text: '#201e1d', text2: '#6b6255', text3: '#a19786',
  remaining: '#8a6100', border: 'rgba(32,30,29,0.14)', sep: 'rgba(32,30,29,0.10)',
  ink: '#8fa073', inkText: '#221f0f', inkText2: 'rgba(34,31,15,0.62)', inkLine: 'rgba(34,31,15,0.16)',
}
export const dark: typeof light = {
  ...light,
  primaryLight: '#3b2a1f', accent2Dark: '#a9bd87', accent2Light: '#2b3323',
  danger: '#ef6a6a', dangerLight: '#3d2322', success: '#a9bd87', warning: '#e08a4f',
  bg: '#1d1915', card: '#2a241e', text: '#f1e7d6', text2: '#b9ac96', text3: '#857a69',
  remaining: '#E0B74E', border: 'rgba(241,231,214,0.14)', sep: 'rgba(241,231,214,0.10)',
  ink: '#4b5937', inkText: '#f3ecd9', inkText2: 'rgba(243,236,217,0.68)', inkLine: 'rgba(243,236,217,0.16)',
}
export const radius = { sm: 12, md: 16, lg: 20, xl: 28 }
export const useTheme = (): Theme => {
  const system = useColorScheme()
  const { pref } = useAppearance()
  const resolved = pref === 'auto' ? system : pref
  return resolved === 'dark' ? dark : light
}

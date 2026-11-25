import { useColorScheme } from 'react-native'

// The same palette as src/index.css in the web app (light + dark).
export const light = {
  primary: '#c67139', primaryDark: '#8c491a', primaryLight: '#f7e4d3',
  accent2: '#7a8a5e', accent2Dark: '#56633f', accent2Light: '#eaf0e0',
  danger: '#D94949', dangerLight: '#fbe5e5', success: '#56633f', warning: '#b2622d',
  bg: '#f5ead8', card: '#ebddc5', text: '#201e1d', text2: '#6b6255', text3: '#a19786',
  remaining: '#8a6100', border: 'rgba(32,30,29,0.14)', sep: 'rgba(32,30,29,0.09)',
}
export const dark = {
  ...light,
  primaryLight: '#3b2a1f', accent2Dark: '#a9bd87', accent2Light: '#2b3323',
  danger: '#ef6a6a', dangerLight: '#3d2322', success: '#a9bd87', warning: '#e08a4f',
  bg: '#1d1915', card: '#2a241e', text: '#f1e7d6', text2: '#b9ac96', text3: '#857a69',
  remaining: '#E0B74E', border: 'rgba(241,231,214,0.14)', sep: 'rgba(241,231,214,0.09)',
}
export const radius = { md: 14, lg: 20, xl: 28 }
export const useTheme = () => (useColorScheme() === 'dark' ? dark : light)

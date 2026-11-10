// Appearance: 'light' (default), 'dark', or 'auto' (follow the device).
// The chosen value is stored on this device; the resolved theme is exposed as
// <html data-theme="light|dark"> so CSS variables can switch.
const KEY = 'sb_theme'
export const THEMES = ['auto', 'light', 'dark']
const LIGHT_BAR = '#c67139'
const DARK_BAR = '#1d1915'

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY)
    return THEMES.includes(v) ? v : 'light'
  } catch {
    return 'light'
  }
}

const systemQuery = () => (typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null)

export function resolveTheme(pref) {
  if (pref === 'auto') return systemQuery()?.matches ? 'dark' : 'light'
  return pref === 'dark' ? 'dark' : 'light'
}

export function applyTheme(pref = getThemePref()) {
  const resolved = resolveTheme(pref)
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? DARK_BAR : LIGHT_BAR)
  return resolved
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref) } catch { /* private mode: apply for this session only */ }
  applyTheme(pref)
}

// Re-apply when the device switches light/dark, but only while on 'auto'.
export function watchSystemTheme() {
  const q = systemQuery()
  if (!q?.addEventListener) return () => {}
  const onChange = () => { if (getThemePref() === 'auto') applyTheme('auto') }
  q.addEventListener('change', onChange)
  return () => q.removeEventListener('change', onChange)
}

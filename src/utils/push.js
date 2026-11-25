// Push notifications from the home server (Firebase Cloud Messaging).
// The server sends data-only messages; the service worker (public/sw.js) shows them.
import app, { db } from '../firebase'
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDoc } from 'firebase/firestore'

const VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim()
const TOKEN_KEY = 'sb-push-token'

export const pushConfigured = () => !!VAPID_KEY

// 'unsupported' | 'ios-install' (iPhone, app not on the home screen) | 'ready'
export async function pushSupport() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    return ios ? 'ios-install' : 'unsupported'
  }
  try {
    const { isSupported } = await import('firebase/messaging')
    return (await isSupported()) ? 'ready' : 'unsupported'
  } catch { return 'unsupported' }
}

export const currentToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const permissionState = () => (typeof Notification === 'undefined' ? 'denied' : Notification.permission)

const deviceLabel = () => {
  const ua = navigator.userAgent
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'Mac' : 'Web'
  return os
}

// Ask permission, get this device's token and save it for the signed-in user.
export async function enablePush(uid) {
  if (!VAPID_KEY) throw new Error('no-vapid')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('denied')
  const { getMessaging, getToken } = await import('firebase/messaging')
  const reg = await navigator.serviceWorker.ready
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
  if (!token) throw new Error('no-token')
  await setDoc(doc(db, 'pushTokens', uid), {
    tokens: arrayUnion(token),
    devices: { [token.slice(-12)]: { label: deviceLabel(), at: Date.now() } },
    updatedAt: serverTimestamp(),
  }, { merge: true })
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* private mode */ }
  return token
}

export async function disablePush(uid) {
  const token = currentToken()
  try {
    const { getMessaging, deleteToken } = await import('firebase/messaging')
    await deleteToken(getMessaging(app))
  } catch { /* already gone */ }
  if (token) {
    await updateDoc(doc(db, 'pushTokens', uid), { tokens: arrayRemove(token) }).catch(() => {})
  }
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

export async function loadPrefs(uid) {
  try {
    const s = await getDoc(doc(db, 'pushTokens', uid))
    return { unusual: true, budget: true, ...(s.exists() ? s.data().prefs : {}) }
  } catch { return { unusual: true, budget: true } }
}
export const savePrefs = (uid, prefs) => setDoc(doc(db, 'pushTokens', uid), { prefs }, { merge: true })

// The home server watches this field and answers with a test notification.
export const requestTestPush = (uid) =>
  setDoc(doc(db, 'pushTokens', uid), { testRequest: serverTimestamp() }, { merge: true })

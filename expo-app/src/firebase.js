import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeFirestore, getFirestore } from 'firebase/firestore'
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Same Firebase project as the web app. Values come from expo-app/.env (EXPO_PUBLIC_*).
const env = process.env
const firebaseConfig = {
  apiKey:            env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const fresh = getApps().length === 0
const app = fresh ? initializeApp(firebaseConfig) : getApp()

export const auth = fresh ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }) : getAuth(app)
// React Native has no IndexedDB, so no persistent cache: the in-memory client is used.
export const db = fresh ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }) : getFirestore(app)
export const storage = getStorage(app)
export default app

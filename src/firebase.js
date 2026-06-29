import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'
import { getStorage } from 'firebase/storage'

const b = (s) => (typeof s === 'string' ? s.replace(/^﻿/, '') : s)

const firebaseConfig = {
  apiKey:            b(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain:        b(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId:         b(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket:     b(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: b(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId:             b(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId:     b(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
}

const app = initializeApp(firebaseConfig)
export const db        = getFirestore(app)
export const auth      = getAuth(app)
export const storage   = getStorage(app)
export let analytics   = null
try { analytics = getAnalytics(app) } catch (e) { /* analytics not available */ }
export default app

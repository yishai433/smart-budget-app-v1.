import { collection, addDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface PriceResult { name: string; price: number; chain?: string; store?: string; label?: string }
export interface PriceAnswer { status: string; results?: PriceResult[]; stale?: boolean; preparing?: boolean; branches?: number; error?: string }

// The home server is outbound-only, so we ask it by writing a request document
// and waiting for it to fill in the answer (same contract as the website).
export function askPriceServer(householdId: string, uid: string, payload: Record<string, unknown>, timeoutMs = 20000): Promise<PriceAnswer> {
  return new Promise((resolve, reject) => {
    ;(async () => {
      try {
        const ref = await addDoc(collection(db, 'priceLookups'), {
          householdId, requestedBy: uid || '', status: 'pending', createdAt: serverTimestamp(), ...payload,
        })
        let done = false
        const timer = setTimeout(() => { if (!done) { done = true; unsub(); deleteDoc(ref).catch(() => {}); reject(new Error('timeout')) } }, timeoutMs)
        const unsub = onSnapshot(ref, (snap) => {
          const d = snap.data() as PriceAnswer | undefined
          if (!d || done || d.status === 'pending') return
          done = true; clearTimeout(timer); unsub(); deleteDoc(ref).catch(() => {})
          resolve(d)
        }, (e) => { if (!done) { done = true; clearTimeout(timer); reject(e) } })
      } catch (e) { reject(e) }
    })()
  })
}

export interface ReceiptAnswer { status: string; text?: string; error?: string }

// Send a receipt photo (base64 JPEG, no data: prefix) to the home server and get its text back.
// OCR plus a possible one-time language download can take a while, so the timeout is generous
// and intermediate "reading" updates don't end the wait.
export function scanReceiptServer(householdId: string, uid: string, imageBase64: string, onStatus?: (s: string) => void, timeoutMs = 90000): Promise<string> {
  return new Promise((resolve, reject) => {
    ;(async () => {
      try {
        const ref = await addDoc(collection(db, 'receiptScans'), {
          householdId, by: uid || '', status: 'pending', image: imageBase64, createdAt: serverTimestamp(),
        })
        let done = false
        const timer = setTimeout(() => { if (!done) { done = true; unsub(); deleteDoc(ref).catch(() => {}); reject(new Error('timeout')) } }, timeoutMs)
        const unsub = onSnapshot(ref, (snap) => {
          const d = snap.data() as ReceiptAnswer | undefined
          if (!d || done) return
          if (d.status === 'pending' || d.status === 'reading') { onStatus?.(d.status); return }
          done = true; clearTimeout(timer); unsub(); deleteDoc(ref).catch(() => {})
          if (d.status === 'error') reject(new Error(d.error || 'קריאת הקבלה נכשלה'))
          else resolve(d.text || '')
        }, (e) => { if (!done) { done = true; clearTimeout(timer); reject(e) } })
      } catch (e) { reject(e) }
    })()
  })
}

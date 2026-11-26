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

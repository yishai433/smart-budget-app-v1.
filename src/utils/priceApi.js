import { collection, addDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// The home server is outbound-only, so the app asks it by writing a document and waiting for the answer.
export function askPriceServer(householdId, uid, payload, timeoutMs = 15000) {
  return new Promise(async (resolve, reject) => {
    try {
      const ref = await addDoc(collection(db, 'priceLookups'), {
        householdId, requestedBy: uid || '', status: 'pending', createdAt: serverTimestamp(), ...payload,
      })
      let done = false
      const timer = setTimeout(() => { if (!done) { done = true; unsub(); deleteDoc(ref).catch(() => {}); reject(new Error('timeout')) } }, timeoutMs)
      const unsub = onSnapshot(ref, (snap) => {
        const d = snap.data()
        if (!d || done || d.status === 'pending') return
        done = true; clearTimeout(timer); unsub(); deleteDoc(ref).catch(() => {})
        d.status === 'done' ? resolve(d) : reject(new Error(d.error || 'error'))
      }, (e) => { if (!done) { done = true; clearTimeout(timer); reject(e) } })
    } catch (e) { reject(e) }
  })
}

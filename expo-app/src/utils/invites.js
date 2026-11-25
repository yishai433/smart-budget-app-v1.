// One-time invite codes live in their own collection (invites/{code}) so the
// household document itself can be locked to its members. A code can only be
// fetched by someone who already knows it; it cannot be listed or searched.
import { db } from '../firebase'
import { doc, getDoc, setDoc, writeBatch, arrayUnion, Timestamp } from 'firebase/firestore'

// no 0/O/1/I/L so a code is easy to read out and type
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function randomCode(len = 8) {
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, n => ALPHABET[n % ALPHABET.length]).join('')
}

export async function createInviteCode(householdId, uid) {
  const code = randomCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await setDoc(doc(db, 'invites', code), {
    householdId, createdBy: uid, used: false,
    expiresAt: Timestamp.fromDate(expiresAt),
  })
  return { code, expiresAt }
}

// Returns 'ok' | 'error' (unknown code) | 'used' | 'expired' | 'self'.
// The membership change and marking the code as used happen in one batch:
// the security rules only accept the two together.
export async function redeemInviteCode(rawCode, uid, currentHouseholdId) {
  const code = (rawCode || '').trim().toUpperCase()
  if (!code) return 'error'
  const inviteRef = doc(db, 'invites', code)
  const snap = await getDoc(inviteRef)
  if (!snap.exists()) return 'error'
  const invite = snap.data()
  if (invite.used) return 'used'
  if (invite.expiresAt.toDate() < new Date()) return 'expired'
  if (invite.householdId === uid || invite.householdId === currentHouseholdId) return 'self'

  const batch = writeBatch(db)
  batch.update(doc(db, 'households', invite.householdId), { members: arrayUnion(uid), lastJoinCode: code })
  batch.update(inviteRef, { used: true, usedBy: uid })
  await batch.commit()
  await setDoc(doc(db, 'userProfiles', uid), { linkedHouseholdId: invite.householdId }, { merge: true })
  return 'ok'
}

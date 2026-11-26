import { db } from '../firebase'
import { doc, getDoc, setDoc, writeBatch, arrayUnion, Timestamp } from 'firebase/firestore'

// no 0/O/1/I/L so a code is easy to read out and type
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function randomCode(len = 8) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export async function createInviteCode(householdId: string, uid: string): Promise<{ code: string; expiresAt: Date }> {
  const code = randomCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await setDoc(doc(db, 'invites', code), { householdId, createdBy: uid, used: false, expiresAt: Timestamp.fromDate(expiresAt) })
  return { code, expiresAt }
}

export type RedeemResult = 'ok' | 'error' | 'used' | 'expired' | 'self'

// Same batch contract as the website: join + mark-used together, then link the profile.
export async function redeemInviteCode(rawCode: string, uid: string, currentHouseholdId: string | null): Promise<RedeemResult> {
  const code = (rawCode || '').trim().toUpperCase()
  if (!code) return 'error'
  const inviteRef = doc(db, 'invites', code)
  const snap = await getDoc(inviteRef)
  if (!snap.exists()) return 'error'
  const invite = snap.data() as { householdId: string; used: boolean; expiresAt: Timestamp }
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

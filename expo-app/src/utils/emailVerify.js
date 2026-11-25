// Email verification for new accounts.
// Accounts created before this feature shipped are not asked to verify, so nobody
// who already uses the app gets locked out. Only email+password accounts need it.
const REQUIRED_FROM = Date.parse('2026-11-25T12:00:00Z')

export function needsEmailVerification(u) {
  if (!u || u.emailVerified) return false
  if (!u.providerData?.some(p => p.providerId === 'password')) return false
  const created = Date.parse(u.metadata?.creationTime || '')
  return created >= REQUIRED_FROM // unknown/old creation time -> do not block
}

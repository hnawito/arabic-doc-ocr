/**
 * Client-side access gate: a convenience lock, not real security, because the
 * check runs in the browser. Only SHA-256 digests of the credentials live here.
 *
 * To change them, replace the two hashes with the SHA-256 of the lowercased
 * user name and of the password, e.g. `printf 'wavz' | sha256sum`.
 */

const USERNAME_HASH = '9e2ecde4077e93db161a23f8a41dd6f454660445132062ec5553e0984201c2ee'
const PASSWORD_HASH = 'e7f05fcad60c924a91184f030fb2635243fa796c4cd34e8f8fbbbf1610a98871'
const SESSION_KEY = 'arabic-ocr:session'

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const [usernameHash, passwordHash] = await Promise.all([
    sha256(username.trim().toLowerCase()),
    sha256(password),
  ])
  return usernameHash === USERNAME_HASH && passwordHash === PASSWORD_HASH
}

/** The session lives for the tab, so a reload does not ask again. */
export function isSignedIn(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'ok'
  } catch {
    return false
  }
}

export function setSignedIn(signedIn: boolean): void {
  try {
    if (signedIn) sessionStorage.setItem(SESSION_KEY, 'ok')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage can be blocked; the gate then simply asks again after a reload.
  }
}

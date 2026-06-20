/**
 * Biometric unlock — WebAuthn-based local device biometric (Face ID / Fingerprint / Windows Hello).
 *
 * Why local-only (no backend)?
 *   This unlocks the *app on this device*, not the cloud account.
 *   PIN remains as fallback (cloud-recoverable). Indian banking apps (PhonePe, Paytm)
 *   work the same way — biometric is a local convenience, not a cloud auth factor.
 *
 * Storage:
 *   localStorage.perk_biometric = { credentialId: base64, userHandle: base64, enrolledAt }
 *
 * Capacitor native (Android APK) path is deferred — WebAuthn works inside Chrome WebView too,
 * so PWA users (the majority) get biometric today.
 */

const STORAGE_KEY = 'perk_biometric_v1'
const RP_NAME = 'PerkWorth'

const b64url = {
  encode(buffer) {
    const bytes = new Uint8Array(buffer)
    let str = ''
    for (const b of bytes) str += String.fromCharCode(b)
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  decode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  },
}

const random = (n = 32) => crypto.getRandomValues(new Uint8Array(n))

const readStore = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}
const writeStore = (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
const clearStore = () => localStorage.removeItem(STORAGE_KEY)

/** Is WebAuthn + platform authenticator (Face ID / Fingerprint) available? */
export async function isBiometricAvailable() {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Is biometric already enrolled on this device for this app? */
export function isBiometricEnrolled() {
  const s = readStore()
  return !!(s && s.credentialId)
}

/**
 * Enroll biometric. User taps "Enable biometric" → device prompts for Face ID / Fingerprint.
 * Stores credentialId locally.
 */
export async function enrollBiometric(displayName = 'PerkWorth user') {
  const supported = await isBiometricAvailable()
  if (!supported) throw new Error('Biometric not available on this device')

  const userHandle = random(16)
  const challenge = random(32)

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: userHandle,
        name: 'perkworth-local',
        displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },    // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })

  if (!cred) throw new Error('Biometric enrollment cancelled')

  writeStore({
    credentialId: b64url.encode(cred.rawId),
    userHandle: b64url.encode(userHandle),
    enrolledAt: new Date().toISOString(),
  })
  return true
}

/**
 * Verify biometric on app unlock. Returns true if verified, false if user cancelled.
 * Throws on hard errors (no enrollment, no support).
 */
export async function verifyBiometric() {
  const store = readStore()
  if (!store?.credentialId) throw new Error('Biometric not enrolled')

  const challenge = random(32)
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: b64url.decode(store.credentialId),
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!assertion
  } catch (e) {
    // NotAllowedError = user cancelled / timed out. Not a hard error — fall back to PIN.
    if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') return false
    throw e
  }
}

/** Disable biometric — wipes local credential. */
export function disableBiometric() {
  clearStore()
}

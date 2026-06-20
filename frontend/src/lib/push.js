// Browser local-push helpers: registers service worker, requests permission,
// fires OS-level notifications when polled feed has new urgent items.
//
// User-first policy:
//  - Only HIGH-VALUE kinds fire as OS toasts (urgent_expiry, ending_soon at d-3,
//    membership_activated, referral_bonus). Anything else stays in-app only.
//  - Each notification fires AT MOST ONCE per device (tracked in localStorage).
//  - Quiet hours: never fire between 22:00 and 08:00 local time (banking-app pattern).
//  - User can opt out entirely via Settings → Notifications.
let registration = null

const PREF_KEY = 'perk_notif_optin'        // '0' = user opted out, anything else = opt-in
const QUIET_START = 22                       // 22:00 local
const QUIET_END = 8                          // 08:00 local

export async function ensureServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  if (registration) return registration
  try { registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' }) } catch { /* ignore */ }
  return registration
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission
  try { return await Notification.requestPermission() } catch { return 'denied' }
}

const FIRED_KEY = 'perk_orbit_fired_notifs'
function loadFired() { try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]')) } catch { return new Set() } }
function saveFired(s) { localStorage.setItem(FIRED_KEY, JSON.stringify([...s].slice(-200))) }

export function isNotifOptedIn() {
  try { return localStorage.getItem(PREF_KEY) !== '0' } catch { return true }
}
export function setNotifOptIn(on) {
  try { localStorage.setItem(PREF_KEY, on ? '1' : '0') } catch { /* ignore */ }
}

function isQuietHours(now = new Date()) {
  const h = now.getHours()
  // Quiet from 22:00 to 08:00 (i.e. h>=22 or h<8)
  return h >= QUIET_START || h < QUIET_END
}

// kinds that fire OS-level toasts (helpful, not spammy)
const PUSH_KINDS = new Set([
  'urgent_expiry',
  'ending_soon',
  'membership_activated',
  'referral_bonus',
])

export async function maybeFireBrowserNotifications(items) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!isNotifOptedIn()) return
  if (isQuietHours()) return  // respect sleep — queue stays in-app, OS toast suppressed
  const fired = loadFired()
  const reg = await ensureServiceWorker()
  for (const n of items || []) {
    if (!PUSH_KINDS.has(n.kind)) continue
    if (n.read) continue
    if (fired.has(n.id)) continue
    const payload = {
      body: n.body || '',
      tag: n.id,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { ref_screen: n.ref_screen || 'home' },
      // urgent expiry stays visible until user dismisses — like a banking alert
      requireInteraction: n.kind === 'urgent_expiry',
    }
    try {
      if (reg && reg.showNotification) { await reg.showNotification(n.title, payload) }
      else { new Notification(n.title, payload) }
      fired.add(n.id)
    } catch { /* ignore */ }
  }
  saveFired(fired)
}

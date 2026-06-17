// Razorpay checkout helper — loads checkout.js on demand
let scriptPromise = null

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve(window.Razorpay)
    s.onerror = () => { scriptPromise = null; reject(new Error('Razorpay script failed to load')) }
    document.body.appendChild(s)
  })
  return scriptPromise
}

export async function openRazorpayCheckout({ keyId, orderId, amount, currency, userName, prefill, onSuccess, onDismiss, onFailure }) {
  const Razorpay = await loadRazorpay()
  const options = {
    key: keyId,
    amount,
    currency,
    name: 'Perk Orbit',
    description: 'Pro Membership — 6 months',
    order_id: orderId,
    prefill: prefill || {},
    theme: { color: '#064E3B' },
    modal: {
      ondismiss: () => { onDismiss && onDismiss() },
    },
    handler: (resp) => onSuccess && onSuccess(resp),
  }
  const rzp = new Razorpay(options)
  rzp.on('payment.failed', (resp) => onFailure && onFailure(resp))
  rzp.open()
  return rzp
}

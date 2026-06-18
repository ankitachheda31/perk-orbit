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
    // Force a custom block order so the "Enter UPI ID" field (UPI Collect) is
    // always visible at the top, then Card, then the rest. Razorpay's default
    // behaviour on mobile only shows the UPI QR/Intent block which hides the
    // typeable VPA input — this config makes the VPA input appear on every
    // platform (incl. desktop test mode where the QR is non-functional).
    config: {
      display: {
        blocks: {
          upi_collect: {
            name: 'Pay using UPI ID',
            instruments: [
              { method: 'upi', flows: ['collect'] },
            ],
          },
          card_pay: {
            name: 'Pay using a card',
            instruments: [
              { method: 'card' },
            ],
          },
          other: {
            name: 'Other ways to pay',
            instruments: [
              { method: 'upi', flows: ['intent', 'qr'] },
              { method: 'netbanking' },
              { method: 'wallet' },
            ],
          },
        },
        sequence: ['block.upi_collect', 'block.card_pay', 'block.other'],
        preferences: { show_default_blocks: false },
      },
    },
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

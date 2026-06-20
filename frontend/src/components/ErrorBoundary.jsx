import React from 'react'

/**
 * App-wide error boundary. Catches any uncaught render-time error from the
 * React tree, displays a friendly recovery card with a "Reload" button, and
 * keeps the rest of the app structure mounted. Prevents the dreaded blank
 * cream screen from ever happening again.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Best-effort console trace — also useful in Sentry-style integrations later.
    // eslint-disable-next-line no-console
    console.error('[PerkWorth] Uncaught render error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    try { window.location.reload() } catch { /* ignore */ }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const msg = (this.state.error && (this.state.error.message || String(this.state.error))) || 'Something went wrong.'
    return (
      <div data-testid="error-boundary" className="min-h-[100dvh] bg-cream flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-ink-200 rounded-3xl shadow-soft p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-terracotta-50 grid place-items-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900">Something went off-orbit</h1>
          <p className="text-sm text-ink-500 mt-2 leading-relaxed">
            Your data is safe — this is just the UI hiccupping. Reload to continue.
          </p>
          <p className="text-[11px] text-ink-400 mt-3 font-mono bg-ink-50 border border-ink-200 rounded-xl px-2 py-1.5 break-all">{msg}</p>
          <div className="flex gap-2 mt-4">
            <button data-testid="err-reset" onClick={this.handleReset} className="flex-1 py-3 rounded-full text-sm font-semibold bg-ink-100 text-ink-700">Try again</button>
            <button data-testid="err-reload" onClick={this.handleReload} className="flex-1 py-3 rounded-full text-sm font-semibold bg-emerald-800 text-white">Reload app</button>
          </div>
        </div>
      </div>
    )
  }
}

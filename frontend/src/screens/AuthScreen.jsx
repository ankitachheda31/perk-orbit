import React, { useState } from 'react'
import { Card, PrimaryButton, GhostButton } from '../components/ui'
import { Auth } from '../lib/api'

export default function AuthScreen({ onAuthed, existingPin }) {
  const [mode, setMode] = useState('login') // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr(''); setBusy(true)
    try {
      const fn = mode === 'login' ? Auth.login : Auth.signup
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name, pin_to_claim: existingPin || undefined }
      const res = await fn(body)
      if (res.access_token) localStorage.setItem('perk_orbit_token', res.access_token)
      localStorage.setItem('perk_orbit_user', JSON.stringify({ id: res.id, email: res.email, name: res.name, phone: res.phone }))
      onAuthed(res)
    } catch (e) {
      const d = e.response?.data?.detail
      setErr(typeof d === 'string' ? d : 'Authentication failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="app-shell flex justify-center" data-testid="auth-screen">
      <div className="w-full max-w-md min-h-[100dvh] flex flex-col px-6 pt-16 pb-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-2xl bg-emerald-800 grid place-items-center text-white font-display font-bold">P</div>
            <span className="font-display text-lg font-bold tracking-tight">Perk Orbit</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-500 mt-2">
            {mode === 'login' ? 'Cloud sync · access your wallet on any device' : 'Your wallet syncs across phones — never lose a voucher.'}
          </p>
          {existingPin && mode === 'signup' ? (
            <p className="text-[11px] text-emerald-800 mt-2 font-semibold">Your local PIN-{existingPin.slice(0,2)}** wallet will be migrated to this account.</p>
          ) : null}
        </div>

        <Card className="p-5 space-y-3">
          {mode === 'signup' ? (
            <div>
              <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Name</label>
              <input data-testid="auth-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full bg-ink-50 border border-ink-200 rounded-2xl px-3 py-3 text-sm" placeholder="Your name" />
            </div>
          ) : null}
          <div>
            <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Email</label>
            <input data-testid="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full bg-ink-50 border border-ink-200 rounded-2xl px-3 py-3 text-sm" placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Password</label>
            <input data-testid="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full bg-ink-50 border border-ink-200 rounded-2xl px-3 py-3 text-sm" placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          {err ? <p data-testid="auth-error" className="text-xs text-terracotta-700">{err}</p> : null}
          <PrimaryButton data-testid="auth-submit" onClick={submit} disabled={busy || !email || !password}>
            {busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </PrimaryButton>
        </Card>

        <div className="text-center mt-4">
          <button data-testid="auth-toggle" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr('') }} className="text-xs text-ink-500">
            {mode === 'login' ? "New to Perk Orbit? Create an account →" : 'Already have an account? Sign in →'}
          </button>
        </div>
        <p className="text-center text-[10px] text-ink-400 mt-auto pt-6">
          By continuing you agree to our Privacy Policy & Terms.
        </p>
      </div>
    </div>
  )
}

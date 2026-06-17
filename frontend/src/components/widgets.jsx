import React, { useState } from 'react'
import { RefreshCw, Mic } from 'lucide-react'
import { isVoiceSupported, startVoiceRecognition } from '../lib/voice'

export function PtrIndicator({ pullY, refreshing }) {
  if (!pullY && !refreshing) return null
  const opacity = refreshing ? 1 : Math.min(1, pullY / 70)
  return (
    <div
      data-testid="ptr-indicator"
      className="fixed left-1/2 -translate-x-1/2 z-[45] w-9 h-9 rounded-full bg-white border border-ink-200 shadow-card grid place-items-center"
      style={{ top: `${Math.min(60, 10 + (refreshing ? 40 : pullY * 0.6))}px`, opacity }}
    >
      <RefreshCw className={`w-4 h-4 text-emerald-800 ${refreshing ? 'animate-spin' : ''}`} />
    </div>
  )
}

export function VoiceMicButton({ onText, lang = 'en-IN' }) {
  const [listening, setListening] = useState(false)
  if (!isVoiceSupported) return null
  const handle = () => {
    if (listening) return
    setListening(true)
    startVoiceRecognition({
      lang,
      onResult: (t) => onText(t),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    })
  }
  return (
    <button
      data-testid="voice-search-btn"
      onClick={handle}
      aria-label="Voice search"
      className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full transition ${listening ? 'bg-terracotta-600 text-white animate-pulse' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'} active:scale-95`}
    >
      <Mic className="w-4 h-4" />
    </button>
  )
}

export function FormField({ label, value, onChange, placeholder, testid, type = 'text', textarea, mono }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">{label}</label>
      {textarea ? (
        <textarea data-testid={testid} value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3}
          className="mt-1.5 w-full bg-ink-50 border border-ink-200 rounded-2xl p-3 text-sm placeholder:text-ink-400" placeholder={placeholder} />
      ) : (
        <input data-testid={testid} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
          className={`mt-1.5 w-full bg-ink-50 border border-ink-200 rounded-2xl px-3 py-3 text-sm placeholder:text-ink-400 ${mono ? 'font-mono' : ''}`} placeholder={placeholder} />
      )}
    </div>
  )
}

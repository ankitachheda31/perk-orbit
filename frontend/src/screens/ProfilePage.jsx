import React, { useState } from 'react'
import { Card, PrimaryButton, TopBar } from '../components/ui'
import { FormField } from '../components/widgets'
import { getProfile, setProfile } from '../lib/store'

export default function ProfilePage({ onBack }) {
  const [p, setP] = useState(getProfile())
  const save = () => { setProfile(p); onBack() }
  return (
    <>
      <TopBar title="Profile" onBack={onBack} />
      <main className="px-5 space-y-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-800 grid place-items-center text-white font-display text-2xl font-bold">{(p.name || 'M')[0].toUpperCase()}</div>
          <div>
            <p className="font-display font-bold text-ink-900 text-lg">{p.name || 'Member'}</p>
            <p className="text-xs text-ink-500">{p.phone || 'No phone added'}</p>
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <FormField label="Name" testid="profile-name" value={p.name} onChange={(v) => setP({ ...p, name: v })} placeholder="Your name" />
          <FormField label="Email" testid="profile-email" value={p.email} onChange={(v) => setP({ ...p, email: v })} placeholder="you@example.com" />
          <FormField label="Phone" testid="profile-phone" value={p.phone} onChange={(v) => setP({ ...p, phone: v })} placeholder="+91 …" />
          <PrimaryButton data-testid="profile-save" onClick={save}>Save</PrimaryButton>
        </Card>
      </main>
    </>
  )
}

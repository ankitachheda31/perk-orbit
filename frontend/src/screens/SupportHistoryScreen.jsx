import React, { useEffect, useState } from 'react'
import { LifeBuoy, MessageCircle } from 'lucide-react'
import { Card, TopBar, Empty, Tag } from '../components/ui'
import { Support } from '../lib/api'
import { fmtDate } from '../lib/format'

export default function SupportHistoryScreen({ onBack, pin }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { Support.history(pin).then(setItems).finally(() => setLoading(false)) }, [pin])
  return (
    <>
      <TopBar title="Support History" onBack={onBack} subtitle="Your WhatsApp Help requests" />
      <main className="px-5 space-y-3">
        {loading ? (
          <div className="space-y-3">{[0, 1].map(i => <div key={i} className="h-20 bg-white rounded-3xl border border-ink-200 animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <Empty title="No support requests yet" sub="Tap the WhatsApp icon on any voucher to get help — we'll log it here." icon={<LifeBuoy className="w-6 h-6" />} testid="empty-support" />
        ) : (
          <div className="space-y-2" data-testid="support-list">
            {items.map(s => (
              <Card key={s.id} className="p-4" data-testid={`support-${s.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-ink-900">{s.brand || 'Help request'}</p>
                    <p className="text-[11px] text-ink-500">{fmtDate(s.created_at)} · via {s.channel}</p>
                  </div>
                  <Tag tone="emerald"><MessageCircle className="w-3 h-3 mr-0.5" /> WhatsApp</Tag>
                </div>
                {s.title ? <p className="text-xs text-ink-700 mt-1">{s.title}</p> : null}
                {s.code ? <code className="text-[10px] code-box inline-block mt-2">{s.code}</code> : null}
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

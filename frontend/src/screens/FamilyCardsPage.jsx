import React, { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Card, Empty, Tag, TopBar } from '../components/ui'
import { VoucherCard } from '../components/Cards'
import { Circle } from '../lib/api'

export default function FamilyCardsPage({ onBack, pin, member, toast, refresh, openHowTo }) {
  const [data, setData] = useState({ member, vouchers: [] })
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Circle.sharedWith(pin, member.id).then(setData).finally(() => setLoading(false))
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [pin, member.id])

  const handleCopy = async (v) => { if (!v.code) return; try { await navigator.clipboard.writeText(v.code); toast(`Copied ${v.code}`) } catch { toast('Copy failed') } }
  const handleUnshare = async (v) => {
    await Circle.unshare(v.id, pin, member.id)
    toast('Removed from this member')
    load(); refresh?.()
  }

  return (
    <>
      <TopBar title={member.name} subtitle={`Family Cards · ${member.relation || 'Family'}`} onBack={onBack} />
      <main className="px-5 space-y-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-800 grid place-items-center text-white font-display text-lg font-bold">{member.name[0].toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-ink-900 leading-tight truncate">{member.name}</p>
            <p className="text-[11px] text-ink-500">Showing vouchers where Shared_With = this member</p>
          </div>
          <Tag tone="emerald" data-testid="family-count">{data.vouchers?.length || 0} cards</Tag>
        </Card>

        {loading ? (
          <div className="space-y-3">{[0, 1].map(i => <div key={i} className="h-24 bg-white rounded-3xl border border-ink-200 animate-pulse" />)}</div>
        ) : (data.vouchers?.length || 0) === 0 ? (
          <Empty title="Nothing shared yet" sub={`Share a voucher from My Coupons with ${member.name} to see it here.`} icon={<Share2 className="w-6 h-6" />} testid="empty-family-cards" />
        ) : (
          <div className="space-y-3" data-testid="family-cards-list">
            {data.vouchers.map(v => (
              <VoucherCard
                key={v.id} v={v}
                onCopy={handleCopy} onHowTo={openHowTo}
                onDelete={() => {}} onShare={() => {}}
                onUnshare={handleUnshare}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}

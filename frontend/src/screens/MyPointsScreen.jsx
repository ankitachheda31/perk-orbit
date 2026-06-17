import React, { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { Card, Empty, TopBar } from '../components/ui'
import { PtrIndicator } from '../components/widgets'
import { Points } from '../lib/api'
import { getProfile } from '../lib/store'
import { fmtINR } from '../lib/format'
import usePullToRefresh from '../lib/usePullToRefresh'

export default function MyPointsScreen({ pin, onProfileClick, refreshKey, openHowTo, bumpRefresh }) {
  const [data, setData] = useState({ total_points: 0, approx_value_inr: 0, breakdown: [] })
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try { setData(await Points.summary(pin)) } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [pin, refreshKey])

  const { pullY, refreshing } = usePullToRefresh(async () => { await load(); bumpRefresh?.() })

  return (
    <>
      <PtrIndicator pullY={pullY} refreshing={refreshing} />
      <TopBar
        title="My Points"
        right={<button data-testid="profile-avatar-points" onClick={onProfileClick} className="w-10 h-10 rounded-full bg-emerald-800 grid place-items-center text-white font-display font-bold border-2 border-white shadow-soft">{(getProfile().name || 'M')[0].toUpperCase()}</button>}
      />
      <main className="px-5 space-y-5">
        <Card className="p-6 bg-gradient-to-br from-emerald-900 to-emerald-700 text-white border-emerald-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-12 w-44 h-44 rounded-full bg-gold-500/15 blur-2xl" />
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-100">Total balance</p>
          <p className="font-display text-5xl font-bold mt-2 leading-none">{Number(data.total_points || 0).toLocaleString('en-IN')}</p>
          <p className="text-sm text-emerald-100 mt-1">points across brands</p>
          <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-100">Approx value</p>
              <p className="font-display text-2xl font-bold mt-1">{fmtINR(data.approx_value_inr)}</p>
            </div>
            <button data-testid="howto-points" onClick={() => openHowTo({ brand: 'Loyalty points', title: 'Redeem your points', how_to_redeem: 'Open each brand’s app or website, navigate to “Rewards” or “Loyalty”, and apply your point balance at checkout. Some programs (HDFC SmartBuy, Tata Neu, Amazon Pay) let you convert points into vouchers — always compare the conversion rate before redeeming.' })} className="bg-white/10 hover:bg-white/15 text-xs font-semibold px-3 py-2 rounded-full">How to redeem</button>
          </div>
        </Card>

        <div>
          <h3 className="font-display font-bold text-ink-900 text-base mb-2 px-1">By brand</h3>
          {loading ? (
            <div className="h-24 bg-white rounded-3xl border border-ink-200 animate-pulse" />
          ) : data.breakdown?.length === 0 ? (
            <Empty title="No points logged" sub="Add a voucher with points to start tracking." icon={<Coins className="w-6 h-6" />} />
          ) : (
            <div className="space-y-2" data-testid="points-breakdown">
              {data.breakdown.map((b, i) => (
                <Card key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-ink-900">{b.brand}</p>
                    {b.parent_company ? <p className="text-[11px] text-ink-500">By {b.parent_company}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-emerald-800">{Number(b.points).toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-ink-500">{fmtINR(b.value)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

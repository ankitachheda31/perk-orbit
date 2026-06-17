import React from 'react'
import { Home, Ticket, Coins, Users } from 'lucide-react'

export default function BottomNav({ active, onChange }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'coupons', label: 'My Coupons', icon: Ticket },
    { id: 'points', label: 'My Points', icon: Coins },
    { id: 'circle', label: 'Circle', icon: Users },
  ]
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl border-t border-ink-200 flex justify-around items-center z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            data-testid={`nav-${id}`}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition ${isActive ? 'text-emerald-800' : 'text-ink-400'}`}
          >
            <Icon strokeWidth={isActive ? 2.4 : 1.8} className="w-[22px] h-[22px]" />
            <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

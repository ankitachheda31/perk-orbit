import React, { useEffect, useState } from 'react'
import { Clock, BadgeCheck, Star, Bell, X } from 'lucide-react'
import { Sheet, Empty } from '../components/ui'
import { Notifications } from '../lib/api'

export default function NotificationSheet({ open, onClose, pin, toast, onJumpToScreen, refreshNotifs }) {
  const [data, setData] = useState({ items: [], unread: 0 })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setData(await Notifications.list(pin)) } catch { /* ignore */ } finally { setLoading(false) }
  }
  useEffect(() => { if (open) load() /* eslint-disable-next-line */ }, [open, pin])

  const markRead = async (n) => {
    if (!n.read) {
      await Notifications.markRead(n.id)
      load(); refreshNotifs?.()
    }
  }
  const handleJump = async (n) => {
    await markRead(n)
    onJumpToScreen?.(n.ref_screen || 'home')
    onClose()
  }
  const markAll = async () => {
    await Notifications.markAllRead(pin)
    load(); refreshNotifs?.()
    toast('All marked as read')
  }
  const remove = async (id) => {
    await Notifications.remove(id)
    load(); refreshNotifs?.()
  }

  const iconFor = (k) => {
    if (k === 'ending_soon') return <Clock className="w-4 h-4 text-terracotta-700" />
    if (k === 'break_even') return <BadgeCheck className="w-4 h-4 text-emerald-700" />
    if (k === 'membership_activated') return <Star className="w-4 h-4 text-gold-500" />
    return <Bell className="w-4 h-4 text-ink-600" />
  }
  const bgFor = (k) => {
    if (k === 'ending_soon') return 'bg-terracotta-50'
    if (k === 'break_even') return 'bg-emerald-50'
    if (k === 'membership_activated') return 'bg-gold-50'
    return 'bg-ink-100'
  }

  return (
    <Sheet open={open} onClose={onClose} title="Notifications" testid="notif-sheet">
      {data.unread > 0 ? (
        <button data-testid="notif-mark-all" onClick={markAll} className="text-xs font-semibold text-emerald-800 mb-3 active:scale-95">Mark all as read</button>
      ) : null}

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-16 bg-ink-100 rounded-2xl animate-pulse" />)}</div>
      ) : data.items.length === 0 ? (
        <Empty title="You're all caught up" sub="We'll ping you when vouchers are about to expire." icon={<Bell className="w-6 h-6" />} testid="empty-notifs" />
      ) : (
        <div className="space-y-2" data-testid="notif-list">
          {data.items.map(n => (
            <div
              key={n.id}
              data-testid={`notif-${n.id}`}
              className={`relative rounded-2xl p-3 border ${n.read ? 'border-ink-200 bg-white' : 'border-emerald-200 bg-emerald-50/40'} flex items-start gap-3`}
            >
              <button onClick={() => handleJump(n)} className="flex items-start gap-3 flex-1 text-left">
                <div className={`w-9 h-9 rounded-full grid place-items-center ${bgFor(n.kind)}`}>{iconFor(n.kind)}</div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-tight ${n.read ? 'text-ink-700' : 'font-bold text-ink-900'}`}>{n.title}</p>
                  {n.body ? <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-2">{n.body}</p> : null}
                </div>
                {!n.read ? <span className="w-2 h-2 rounded-full bg-emerald-700 mt-2 shrink-0" /> : null}
              </button>
              <button data-testid={`notif-del-${n.id}`} onClick={() => remove(n.id)} className="w-7 h-7 rounded-full bg-ink-100 grid place-items-center text-ink-500 hover:text-terracotta-700 active:scale-95">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

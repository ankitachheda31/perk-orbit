import React, { useEffect, useState } from 'react'
import { Share2, UserPlus } from 'lucide-react'
import { Sheet, Empty } from '../components/ui'
import { Circle } from '../lib/api'

export default function ShareSheet({ open, onClose, voucher, pin, toast, refresh }) {
  const [members, setMembers] = useState([])
  useEffect(() => { if (open) Circle.list(pin).then(setMembers) }, [open, pin])
  const share = async (m) => {
    await Circle.share({ user_pin: pin, voucher_id: voucher.id, family_member_id: m.id })
    toast(`Shared with ${m.name}`); onClose(); refresh()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Share "${voucher?.brand || 'voucher'}"`} testid="share-sheet">
      {members.length === 0 ? (
        <Empty title="No circle members yet" sub="Add family in Profile → Family Circle to share." icon={<UserPlus className="w-6 h-6" />} />
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <button key={m.id} data-testid={`share-to-${m.id}`} onClick={() => share(m)} className="w-full bg-white border border-ink-200 hover:border-emerald-700 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 grid place-items-center text-emerald-800 font-display font-bold">{m.name[0]}</div>
                <div className="text-left">
                  <p className="font-display font-bold text-ink-900">{m.name}</p>
                  <p className="text-[11px] text-ink-500">{m.relation || 'Family'}</p>
                </div>
              </div>
              <Share2 className="w-4 h-4 text-emerald-800" />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}

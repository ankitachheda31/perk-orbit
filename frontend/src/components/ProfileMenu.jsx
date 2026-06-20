import React from 'react'
import { ShieldCheck, Star, Sparkles, UserPlus, Smartphone, LifeBuoy, FileText, MessageCircle, Lock, Settings as SettingsIcon, LogOut, CreditCard, ShieldAlert } from 'lucide-react'
import { Tag } from './ui'
import { getProfile } from '../lib/store'

export default function ProfileMenu({ open, onClose, onNavigate, memberStatus, isAdmin }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" onClick={onClose} data-testid="profile-menu-backdrop">
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="profile-menu"
        className="absolute top-16 right-3 w-[78%] max-w-[300px] bg-white border border-ink-200 rounded-3xl shadow-card overflow-hidden page-enter"
      >
        <button data-testid="menu-profile" onClick={() => { onNavigate('profile'); onClose() }} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-ink-50 transition">
          <div className="w-10 h-10 rounded-full bg-emerald-100 grid place-items-center text-emerald-800 font-display font-bold">{(getProfile().name || 'M')[0]}</div>
          <div className="text-left min-w-0 flex-1">
            <p className="font-display font-semibold text-ink-900 text-sm leading-tight">{getProfile().name || 'Member'}</p>
            <p className="text-[11px] text-ink-500 truncate">View profile</p>
          </div>
          <span data-testid="profile-encrypted-badge" className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <ShieldCheck className="w-3 h-3" /> Encrypted
          </span>
        </button>
        <div className="border-t border-ink-100" />
        <button data-testid="menu-membership" onClick={() => { onNavigate('membership'); onClose() }} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ink-50">
          <div className="flex items-center gap-3">
            <Star className="w-4 h-4 text-gold-500" />
            <span className="text-sm font-semibold text-ink-800">Membership</span>
          </div>
          {memberStatus?.active ? <Tag tone="gold">Active</Tag> : <Tag tone="neutral">₹99</Tag>}
        </button>
        <button data-testid="menu-perk-tips" onClick={() => { onNavigate('perk-tips'); onClose() }} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ink-50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-semibold text-ink-800">Perk Tips</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Masterclass</span>
        </button>
        <button data-testid="menu-card-optimizer" onClick={() => { onNavigate('card-optimizer'); onClose() }} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ink-50">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-semibold text-ink-800">Savings Assistant</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700 bg-gold-50 border border-gold-200 rounded-full px-2 py-0.5">Cards</span>
        </button>

        {isAdmin && (
          <button data-testid="menu-admin-registry" onClick={() => { onNavigate('admin-registry'); onClose() }} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ink-50">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-terracotta-700" />
              <span className="text-sm font-semibold text-ink-800">Registry Management</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-full px-2 py-0.5">Admin</span>
          </button>
        )}
        <button data-testid="menu-circle" onClick={() => { onNavigate('circle'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <UserPlus className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">Family Circle</span>
        </button>
        <button data-testid="menu-sms-scanner" onClick={() => { onNavigate('sms-scanner'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <Smartphone className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">SMS Auto-Scanner</span>
        </button>
        <button data-testid="menu-support" onClick={() => { onNavigate('support'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <LifeBuoy className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">Support History</span>
        </button>
        <button data-testid="menu-privacy" onClick={() => { onNavigate('privacy'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <FileText className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">Privacy Policy</span>
        </button>
        <button data-testid="menu-protect" onClick={() => { onNavigate('protect'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <ShieldCheck className="w-4 h-4 text-emerald-800" />
          <span className="text-sm font-semibold text-ink-800">How we protect you</span>
        </button>
        <button data-testid="menu-faq" onClick={() => { onNavigate('faq'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <MessageCircle className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">Security FAQ</span>
        </button>
        <button data-testid="menu-privacy-control" onClick={() => { onNavigate('privacy-control'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <Lock className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">Privacy Control</span>
        </button>
        <button data-testid="menu-settings" onClick={() => { onNavigate('settings'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50">
          <SettingsIcon className="w-4 h-4 text-ink-700" />
          <span className="text-sm font-semibold text-ink-800">Settings</span>
        </button>
        <div className="border-t border-ink-100" />
        <button data-testid="menu-lock" onClick={() => { onNavigate('lock'); onClose() }} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 text-terracotta-700">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-semibold">Lock app</span>
        </button>
      </div>
    </div>
  )
}

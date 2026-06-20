import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, ExternalLink, Sparkles, TrendingUp, Award, IndianRupee } from 'lucide-react'
import { Card, TopBar } from '../components/ui'
import { Cards as CardsApi } from '../lib/api'

/**
 * Credit Card Optimizer — picks the best reward card for the user's
 * dominant spend category. India has 100+ cards but only ~7 deliver
 * genuine net value after fees. We curate; we don't list.
 *
 * Affiliate hook: every "Apply" CTA logs a click via /api/cards/click
 * before opening the issuer's site in a new tab. Switch apply_url to a
 * tracked deeplink later (Cardz/Bankbazaar/etc.) — no frontend change needed.
 */
export default function CardOptimizerScreen({ onBack, pin, toast }) {
  const [meta, setMeta] = useState({ cards: [], categories: [] })
  const [category, setCategory] = useState('online_shopping')
  const [spend, setSpend] = useState(10000)
  const [best, setBest] = useState([])
  const [loadingBest, setLoadingBest] = useState(true)
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    CardsApi.list()
      .then((d) => setMeta(d))
      .catch(() => setMeta({ cards: [], categories: [] }))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    setLoadingBest(true)
    CardsApi.best(category, spend, 3)
      .then((d) => setBest(d.results || []))
      .catch(() => setBest([]))
      .finally(() => setLoadingBest(false))
  }, [category, spend])

  const fmtINR = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`

  const handleApply = (card, source) => {
    CardsApi.logClick({ card_id: card.id, user_pin: pin, category, source })
    window.open(card.apply_url, '_blank', 'noopener,noreferrer')
    toast?.(`Opening ${card.name}…`)
  }

  const selectedCatLabel = useMemo(
    () => meta.categories.find((c) => c.id === category)?.label || category,
    [category, meta.categories],
  )

  return (
    <>
      <TopBar
        title="Card Optimizer"
        onBack={onBack}
        subtitle="The right card pays for itself in 2 months"
      />
      <main className="px-5 pb-32 space-y-4">
        {/* Hero / explainer */}
        <section
          data-testid="card-optimizer-hero"
          className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-800 via-emerald-900 to-ink-900 text-white border border-emerald-900/40"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold-500/15 blur-2xl pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-100/80 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Smart pick
            </p>
            <h2 className="font-display font-bold text-2xl mt-1.5 leading-tight">
              Best card for your <span className="text-gold-300">{selectedCatLabel}</span> spend
            </h2>
            <p className="text-[12px] text-white/80 mt-2">
              Based on ₹{spend.toLocaleString('en-IN')}/month — we calculate net annual value after fees, not the loud advertised rate.
            </p>
          </div>
        </section>

        {/* Inputs */}
        <Card className="p-5">
          <p className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-3">
            Tell us your spend
          </p>

          <label className="text-xs font-semibold text-ink-700 mb-2 block">
            Category
          </label>
          <div className="flex flex-wrap gap-2 mb-4" data-testid="category-chips">
            {meta.categories.map((c) => (
              <button
                key={c.id}
                data-testid={`cat-${c.id}`}
                onClick={() => setCategory(c.id)}
                className={`text-xs font-semibold px-3 py-2 rounded-full border transition active:scale-95 ${
                  category === c.id
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white text-ink-700 border-ink-200 hover:border-emerald-300'
                }`}
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-ink-700 mb-2 block">
            Monthly spend in this category:{' '}
            <span className="text-emerald-800 font-bold tabular-nums">
              {fmtINR(spend)}
            </span>
          </label>
          <input
            data-testid="spend-slider"
            type="range"
            min={2000}
            max={100000}
            step={1000}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            className="w-full accent-emerald-800"
          />
          <div className="flex justify-between text-[10px] text-ink-500 mt-1 tabular-nums">
            <span>₹2K</span>
            <span>₹1L</span>
          </div>
        </Card>

        {/* Best picks */}
        <section>
          <h3 className="text-[11px] font-bold text-ink-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
            <Award className="w-3 h-3" /> Top picks for you
          </h3>
          {loadingBest ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 bg-white rounded-3xl border border-ink-200 animate-pulse" />
              ))}
            </div>
          ) : best.length === 0 ? (
            <Card className="p-5 text-center text-sm text-ink-500">
              No cards match this category yet.
            </Card>
          ) : (
            <div className="space-y-3" data-testid="best-cards-list">
              {best.map((c, idx) => (
                <BestCardRow
                  key={c.id}
                  card={c}
                  rank={idx + 1}
                  onApply={() => handleApply(c, 'best')}
                />
              ))}
            </div>
          )}
        </section>

        {/* Full catalog */}
        <section>
          <h3 className="text-[11px] font-bold text-ink-500 uppercase tracking-wider px-1 mb-2 mt-6 flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" /> All curated cards ({meta.cards.length})
          </h3>
          {loadingList ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 bg-white rounded-3xl border border-ink-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3" data-testid="all-cards-list">
              {meta.cards.map((c) => (
                <CatalogCardRow key={c.id} card={c} onApply={() => handleApply(c, 'list')} />
              ))}
            </div>
          )}
          <p className="text-[10px] text-ink-400 text-center mt-4 leading-relaxed">
            Rates reflect publicly listed program terms. Card terms can change anytime — we recalibrate quarterly.
            PerkWorth may earn a referral fee at no cost to you when you apply via these links.
          </p>
        </section>
      </main>
    </>
  )
}

function BestCardRow({ card, rank, onApply }) {
  const fmtINR = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`
  return (
    <Card className="p-5" data-testid={`best-card-${card.id}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-2xl grid place-items-center font-display font-bold text-sm shrink-0 ${
          rank === 1
            ? 'bg-gold-500 text-ink-900'
            : rank === 2
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-ink-100 text-ink-700'
        }`}>
          {rank === 1 ? '🏆' : `#${rank}`}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-ink-900 text-sm leading-tight">{card.name}</p>
          <p className="text-[11px] text-ink-500">{card.issuer}</p>
          <p className="text-[12px] text-ink-700 mt-1.5 leading-snug">{card.tagline}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat
          label="Reward rate"
          value={`${card.category_rate_pct}%`}
          tone="emerald"
        />
        <Stat
          label="Annual reward"
          value={fmtINR(card.estimated_annual_reward_inr)}
          tone="gold"
        />
        <Stat
          label="Net value"
          value={fmtINR(card.net_annual_value_inr)}
          tone={card.net_annual_value_inr > 0 ? 'emerald' : 'ink'}
        />
      </div>

      <div className="mt-3 text-[11px] text-ink-600 leading-relaxed">
        <span className="font-semibold text-ink-700">Annual fee:</span>{' '}
        {card.annual_fee_inr === 0 ? (
          <span className="text-emerald-800 font-bold">LIFETIME FREE</span>
        ) : card.fee_waived ? (
          <span>
            {fmtINR(card.annual_fee_inr)} —{' '}
            <span className="text-emerald-800 font-bold">waived at your spend</span>
          </span>
        ) : (
          <>
            {fmtINR(card.annual_fee_inr)} (waived at {fmtINR(card.fee_waiver_spend_inr)} spend/yr)
          </>
        )}
      </div>

      <button
        data-testid={`apply-${card.id}`}
        onClick={onApply}
        className="mt-4 w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wide px-4 py-3 rounded-full active:scale-95 transition inline-flex items-center justify-center gap-2"
      >
        Apply on issuer site
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </Card>
  )
}

function CatalogCardRow({ card, onApply }) {
  return (
    <Card className="p-4" data-testid={`catalog-card-${card.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-ink-900 text-sm leading-tight">{card.name}</p>
          <p className="text-[11px] text-ink-500 mb-1.5">{card.issuer}</p>
          <p className="text-[11px] text-ink-700 leading-snug">{card.tagline}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {(card.best_for || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button
          data-testid={`catalog-apply-${card.id}`}
          onClick={onApply}
          className="shrink-0 text-[11px] font-bold text-emerald-800 px-3 py-2 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition inline-flex items-center gap-1"
        >
          Apply
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </Card>
  )
}

function Stat({ label, value, tone = 'ink' }) {
  const toneCls = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    gold: 'bg-gold-50 border-gold-200 text-ink-900',
    ink: 'bg-ink-50 border-ink-200 text-ink-700',
  }[tone] || 'bg-ink-50 border-ink-200 text-ink-700'
  return (
    <div className={`rounded-2xl px-2.5 py-2 border ${toneCls}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="font-display font-bold text-sm tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  )
}

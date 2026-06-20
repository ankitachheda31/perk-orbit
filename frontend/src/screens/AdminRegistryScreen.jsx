import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, ShieldCheck, ClipboardList, Activity, ExternalLink, Loader2, Square, CheckSquare } from 'lucide-react'
import { Card, TopBar } from '../components/ui'
import { Admin } from '../lib/api'

/**
 * Admin Registry Management — review pending loyalty registry updates surfaced
 * by the GPT-4o-powered Registry Intelligence cron (Mon/Wed/Fri 04:00 IST).
 *
 * UX principles:
 *  - HIGH-IMPACT changes pinned at the very top with a red rail + 🚨 icon.
 *  - Bulk select with checkboxes + sticky bulk action bar at the bottom.
 *  - Three tabs: Pending · Changelog · Runs.
 *  - Run-now button for manual trigger (skip the 2-day cycle).
 *  - Hard guard: any 403 sends the user back home with a clear message.
 */
export default function AdminRegistryScreen({ onBack, toast }) {
  const [tab, setTab] = useState('pending')
  const [pending, setPending] = useState([])
  const [changelog, setChangelog] = useState([])
  const [runs, setRuns] = useState([])
  const [stats, setStats] = useState({ pending: 0, high_impact_pending: 0, approved_total: 0, rejected_total: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p, cl, rn] = await Promise.all([
        Admin.stats(),
        Admin.pending('pending'),
        Admin.changelog(),
        Admin.runs(),
      ])
      setStats(s)
      setPending(p.items || [])
      setChangelog(cl.items || [])
      setRuns(rn.items || [])
      setForbidden(false)
    } catch (e) {
      if (e?.response?.status === 403) {
        setForbidden(true)
      } else {
        toast?.('Could not load registry data')
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAll = () => setSelected(new Set(pending.map((p) => p._id)))
  const clearSelect = () => setSelected(new Set())

  // Sort: HIGH IMPACT first, then most-recent
  const sortedPending = useMemo(() => {
    return [...pending].sort((a, b) => {
      if (a.high_impact && !b.high_impact) return -1
      if (!a.high_impact && b.high_impact) return 1
      return (b.detected_at || '').localeCompare(a.detected_at || '')
    })
  }, [pending])

  const doBulk = async (action) => {
    if (selected.size === 0) { toast?.('Select at least one item'); return }
    if (busy) return
    setBusy(true)
    try {
      const ids = [...selected]
      const fn = action === 'approve' ? Admin.bulkApprove : Admin.bulkReject
      const r = await fn(ids, null)
      toast?.(`${action === 'approve' ? 'Approved' : 'Rejected'} ${r[action === 'approve' ? 'approved' : 'rejected']} · ${r.failed} failed`)
      clearSelect()
      await fetchAll()
    } catch {
      toast?.('Bulk action failed')
    } finally { setBusy(false) }
  }

  const doSingle = async (id, action) => {
    if (busy) return
    setBusy(true)
    try {
      if (action === 'approve') await Admin.approve(id, null)
      else await Admin.reject(id, null)
      toast?.(`${action === 'approve' ? 'Approved' : 'Rejected'}`)
      setSelected((s) => { const n = new Set(s); n.delete(id); return n })
      await fetchAll()
    } catch {
      toast?.('Action failed')
    } finally { setBusy(false) }
  }

  const triggerRunNow = async () => {
    if (busy) return
    setBusy(true)
    toast?.('Running registry scan… this can take 30-60s')
    try {
      const r = await Admin.runNow()
      toast?.(`Scan complete · ${r.new_pending} new pending · ${r.high_impact} high-impact`)
      await fetchAll()
    } catch {
      toast?.('Scan failed')
    } finally { setBusy(false) }
  }

  if (forbidden) {
    return (
      <>
        <TopBar title="Admin" onBack={onBack} />
        <main className="px-5 pt-8" data-testid="admin-forbidden">
          <Card className="p-6 text-center">
            <ShieldCheck className="w-10 h-10 text-ink-400 mx-auto mb-3" />
            <p className="font-display font-bold text-ink-900">Admin access required</p>
            <p className="text-sm text-ink-500 mt-1">This area is restricted to PerkWorth administrators.</p>
          </Card>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar title="Registry Management" onBack={onBack} subtitle="Approve loyalty changes before they go live" />
      <main className="px-5 pb-32 space-y-4" data-testid="admin-registry-screen">
        {/* Stats strip */}
        <section className="grid grid-cols-4 gap-2" data-testid="admin-stats">
          <StatTile label="Pending" value={stats.pending} tone="ink" testid="stat-pending" />
          <StatTile label="High Impact" value={stats.high_impact_pending} tone="terracotta" testid="stat-high-impact" />
          <StatTile label="Approved" value={stats.approved_total} tone="emerald" testid="stat-approved" />
          <StatTile label="Rejected" value={stats.rejected_total} tone="ink" testid="stat-rejected" />
        </section>

        {/* Tabs + run-now */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2" data-testid="admin-tabs">
            {[['pending','Pending'],['changelog','Changelog'],['runs','Runs']].map(([k,label]) => (
              <button
                key={k}
                data-testid={`tab-${k}`}
                onClick={() => setTab(k)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full border transition ${tab === k ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-ink-700 border-ink-200 hover:border-emerald-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            data-testid="admin-run-now"
            onClick={triggerRunNow}
            disabled={busy}
            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-gold-100 border border-gold-300 text-gold-900 hover:bg-gold-200 active:scale-95 transition disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Run scan now
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
        ) : tab === 'pending' ? (
          <>
            {sortedPending.length === 0 ? (
              <Card className="p-6 text-center" data-testid="pending-empty">
                <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                <p className="font-display font-bold text-ink-900">All caught up</p>
                <p className="text-xs text-ink-500 mt-1">No pending changes to review.</p>
              </Card>
            ) : (
              <>
                {/* Bulk select header */}
                <div className="flex items-center justify-between bg-white rounded-2xl border border-ink-200 px-3 py-2">
                  <button
                    data-testid="bulk-select-all"
                    onClick={selected.size === sortedPending.length ? clearSelect : selectAll}
                    className="text-[11px] font-bold uppercase tracking-wider text-ink-700 inline-flex items-center gap-1.5 px-2 py-1 hover:bg-ink-50 rounded-full"
                  >
                    {selected.size === sortedPending.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {selected.size === sortedPending.length ? 'Clear' : 'Select all'} ({selected.size}/{sortedPending.length})
                  </button>
                </div>

                <div className="space-y-3" data-testid="pending-list">
                  {sortedPending.map((it) => (
                    <PendingRow
                      key={it._id}
                      item={it}
                      checked={selected.has(it._id)}
                      onToggle={() => toggleSelect(it._id)}
                      onApprove={() => doSingle(it._id, 'approve')}
                      onReject={() => doSingle(it._id, 'reject')}
                      busy={busy}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : tab === 'changelog' ? (
          <ChangelogList items={changelog} />
        ) : (
          <RunsList items={runs} />
        )}
      </main>

      {/* STICKY BULK ACTION BAR */}
      {tab === 'pending' && selected.size > 0 && (
        <div
          data-testid="bulk-action-bar"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(420px,92vw)] bg-ink-900 text-white rounded-full shadow-2xl px-3 py-2.5 flex items-center justify-between gap-2"
        >
          <span className="text-[12px] font-bold pl-2">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              data-testid="bulk-reject"
              onClick={() => doBulk('reject')}
              disabled={busy}
              className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-terracotta-100 text-terracotta-900 active:scale-95 transition disabled:opacity-50"
            >
              Reject {selected.size}
            </button>
            <button
              data-testid="bulk-approve"
              onClick={() => doBulk('approve')}
              disabled={busy}
              className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-emerald-500 text-ink-900 active:scale-95 transition disabled:opacity-50"
            >
              Approve {selected.size}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function StatTile({ label, value, tone, testid }) {
  const toneCls = {
    ink: 'bg-white border-ink-200 text-ink-900',
    terracotta: 'bg-terracotta-50 border-terracotta-300 text-terracotta-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  }[tone]
  return (
    <div className={`rounded-2xl border px-2 py-3 ${toneCls}`} data-testid={testid}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="font-display font-bold text-xl tabular-nums leading-none mt-1">{value}</p>
    </div>
  )
}

function PendingRow({ item, checked, onToggle, onApprove, onReject, busy }) {
  const isHI = !!item.high_impact
  return (
    <div
      data-testid={`pending-row-${item._id}`}
      data-high-impact={isHI ? 'true' : 'false'}
      className={`relative rounded-3xl border bg-white overflow-hidden ${isHI ? 'border-terracotta-400 ring-1 ring-terracotta-300' : 'border-ink-200'}`}
    >
      {isHI && (
        <div className="absolute inset-y-0 left-0 w-1.5 bg-terracotta-500" data-testid={`hi-rail-${item._id}`} />
      )}
      <div className="p-4 pl-5">
        <div className="flex items-start gap-2.5">
          <button
            onClick={onToggle}
            data-testid={`select-${item._id}`}
            className="mt-0.5 w-5 h-5 rounded-md border border-ink-300 grid place-items-center bg-white hover:bg-ink-50 transition shrink-0"
            aria-label={checked ? 'Deselect' : 'Select'}
          >
            {checked && <CheckSquare className="w-4 h-4 text-emerald-700" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isHI && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-terracotta-800 bg-terracotta-100 border border-terracotta-300 rounded-full px-2 py-0.5" data-testid={`hi-badge-${item._id}`}>
                  <AlertTriangle className="w-3 h-3" /> HIGH IMPACT
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 bg-ink-50 border border-ink-200 rounded-full px-2 py-0.5">
                {(item.change_type || 'change').replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                {item.type || 'generic'}
              </span>
            </div>
            <p className="font-display font-bold text-ink-900 mt-2 leading-tight">{item.brand || 'Unknown brand'}{item.program ? ` · ${item.program}` : ''}</p>
            <p className="text-xs text-ink-700 mt-1 leading-relaxed">{item.summary}</p>
            {isHI && item.high_impact_reason && (
              <div className="mt-2 bg-terracotta-50 border border-terracotta-200 rounded-2xl px-3 py-2">
                <p className="text-[10px] font-bold text-terracotta-900 uppercase tracking-wider">Why high-impact</p>
                <p className="text-xs text-terracotta-900 mt-0.5">{item.high_impact_reason}</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 text-[10px] text-ink-500">
              <span>{item.source_name} · {new Date(item.detected_at).toLocaleDateString()}</span>
              {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-800 font-semibold hover:underline">
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                data-testid={`reject-${item._id}`}
                onClick={onReject}
                disabled={busy}
                className="flex-1 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-white border border-ink-200 text-ink-700 hover:bg-ink-50 active:scale-95 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                data-testid={`approve-${item._id}`}
                onClick={onApprove}
                disabled={busy}
                className="flex-1 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-emerald-800 text-white hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangelogList({ items }) {
  if (!items.length) return <Card className="p-6 text-center text-sm text-ink-500" data-testid="changelog-empty">No actions yet.</Card>
  return (
    <div className="space-y-2" data-testid="changelog-list">
      {items.map((it) => (
        <div key={it._id} className={`rounded-2xl border bg-white p-3 ${it.high_impact ? 'border-terracotta-200' : 'border-ink-200'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            {it.high_impact && <AlertTriangle className="w-3.5 h-3.5 text-terracotta-700" />}
            <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${it.action === 'rejected' ? 'bg-ink-100 text-ink-700' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {it.action.replace(/_/g, ' ')}
            </span>
            <span className="font-display font-bold text-sm text-ink-900">{it.brand}</span>
            {it.program && <span className="text-[11px] text-ink-500">· {it.program}</span>}
          </div>
          <p className="text-[11px] text-ink-500 mt-1">{new Date(it.at).toLocaleString()} · by {it.actor || 'system'}</p>
          {it.note && <p className="text-[11px] text-ink-700 mt-1 italic">&ldquo;{it.note}&rdquo;</p>}
        </div>
      ))}
    </div>
  )
}

function RunsList({ items }) {
  if (!items.length) return <Card className="p-6 text-center text-sm text-ink-500" data-testid="runs-empty">No runs yet. Click <strong>Run scan now</strong> to trigger a manual cycle.</Card>
  return (
    <div className="space-y-2" data-testid="runs-list">
      {items.map((r) => (
        <div key={r._id} className="rounded-2xl border border-ink-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] font-bold text-ink-700">{new Date(r.started_at).toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-ink-500">{Math.round((new Date(r.finished_at) - new Date(r.started_at)) / 1000)}s</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-2 text-[10px]">
            <Pair label="Fetched" v={r.fetched_articles} />
            <Pair label="Classified" v={r.classified_changes} />
            <Pair label="New" v={r.new_pending} tone="emerald" />
            <Pair label="High-impact" v={r.high_impact} tone={r.high_impact > 0 ? 'terracotta' : 'ink'} />
          </div>
          {r.errors?.length > 0 && (
            <p className="text-[10px] text-terracotta-700 mt-1.5">errors: {r.errors.length}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function Pair({ label, v, tone = 'ink' }) {
  const cls = { ink: 'text-ink-800', emerald: 'text-emerald-800', terracotta: 'text-terracotta-700' }[tone]
  return (
    <div className="text-center">
      <p className="text-ink-500 uppercase">{label}</p>
      <p className={`font-display font-bold ${cls}`}>{v}</p>
    </div>
  )
}

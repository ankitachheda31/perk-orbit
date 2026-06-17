import React, { useEffect, useState } from 'react'
import { Tag } from './ui'
import { Search as SearchApi } from '../lib/api'

export default function SearchResult({ q, pin, onOpenVoucher }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!q.trim()) { setData(null); return }
    const id = setTimeout(() => {
      SearchApi.brand(q.trim(), pin).then(setData).catch(() => setData(null))
    }, 250)
    return () => clearTimeout(id)
  }, [q, pin])
  if (!q.trim() || !data) return null
  return (
    <div className="mt-3 bg-white border border-ink-200 rounded-2xl p-3 page-enter space-y-3" data-testid="search-result">
      {data.parent_company ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-ink-500 uppercase font-bold tracking-wider">Parent company</p>
            <p className="font-display font-bold text-ink-900 text-lg leading-tight">{data.parent_company}</p>
          </div>
          <Tag tone="gold">Smart Match</Tag>
        </div>
      ) : (
        <p className="text-sm text-ink-500">No parent-company match. Try a brand like “Croma” or “Myntra”.</p>
      )}

      {data.user_matches?.length ? (
        <div className="pt-3 border-t border-ink-100" data-testid="search-user-matches">
          <p className="text-[11px] text-ink-500 uppercase font-bold tracking-wider mb-2">Your coupons</p>
          <div className="space-y-1.5">
            {data.user_matches.slice(0, 4).map(u => (
              <button
                key={u.id}
                data-testid={`user-match-${u.id}`}
                onClick={() => onOpenVoucher?.(u)}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-ink-50 active:scale-[0.98] transition text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{u.brand} <span className="text-ink-400 font-normal text-xs">· {u.parent_company || '—'}</span></p>
                  <p className="text-[11px] text-ink-500 truncate">{u.title}</p>
                </div>
                {u.code ? <span className="code-box text-[10px]">{u.code}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {data.matches?.length ? (
        <div className="pt-3 border-t border-ink-100 flex flex-wrap gap-1.5" data-testid="search-matches">
          {data.matches.slice(0, 6).map((m, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-ink-100 text-ink-700">{m.brand} · {m.parent_company}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

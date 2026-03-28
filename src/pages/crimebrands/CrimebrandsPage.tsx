// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

type Crimebrand = {
  id: string
  name: string
  slug: string
  rank: string
  icon_url: string | null
  artwork_url: string | null
  source: string | null
  unreleased: boolean
  release_order: number
}

const RANK_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#C084FC',
  B: '#60A5FA',
}

const RANK_BG: Record<string, string> = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  A: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
}

export function CrimebrandsPage() {
  const [items, setItems] = useState<Crimebrand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rankFilter, setRankFilter] = useState<string[]>([])
  const [sort, setSort] = useState<'release' | 'alpha'>('release')

  useEffect(() => {
    supabase
      .from('crimebrands')
      .select('id,name,slug,rank,icon_url,artwork_url,source,unreleased,release_order')
      .order('release_order')
      .then(({ data }) => {
        setItems(data || [])
        setLoading(false)
      })
  }, [])

  function toggleRank(r: string) {
    setRankFilter(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  const filtered = useMemo(() => {
    let out = items
    if (search.trim()) out = out.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (rankFilter.length) out = out.filter(c => rankFilter.includes(c.rank))
    if (sort === 'alpha') out = [...out].sort((a, b) => a.name.localeCompare(b.name, 'th'))
    return out
  }, [items, search, rankFilter, sort])

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-52 flex items-center justify-center overflow-hidden bg-gradient-to-b from-ptn-surface to-ptn-bg border-b border-ptn-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3b0a0a55_0%,_transparent_70%)]" />
        <h1 className="relative font-heading text-5xl md:text-6xl font-bold tracking-[0.2em] text-ptn-text z-10 uppercase">
          Crimebrands
        </h1>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ptn-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded border border-ptn-border bg-ptn-elevated text-ptn-text placeholder-ptn-muted outline-none focus:border-ptn-red"
            />
          </div>

          {/* Rank filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-ptn-muted mr-1">แรงค์</span>
            {['S', 'A', 'B'].map(r => (
              <button
                key={r}
                onClick={() => toggleRank(r)}
                className={cn(
                  'w-9 h-9 rounded font-heading font-bold text-sm border transition-all',
                  rankFilter.includes(r)
                    ? RANK_BG[r]
                    : 'border-ptn-border text-ptn-muted hover:border-ptn-text hover:text-ptn-text',
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1">
            {(['release', 'alpha'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium border transition-all',
                  sort === s
                    ? 'bg-ptn-red text-white border-ptn-red'
                    : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
                )}
              >
                {s === 'release' ? 'วันที่ออก' : 'ตามชื่อ'}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-ptn-muted">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-ptn-muted">ไม่พบ Crimebrand</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {filtered.map(cb => (
              <Link key={cb.id} to={`/crimebrands/${cb.slug}`} className="group flex flex-col">
                <div className="relative aspect-square rounded-lg overflow-hidden border border-ptn-border bg-ptn-elevated group-hover:border-ptn-red/50 transition-colors">
                  {/* Rank badge */}
                  <div
                    className="absolute top-1.5 left-1.5 z-10 text-xs font-heading font-bold w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: `${RANK_COLORS[cb.rank]}25`, color: RANK_COLORS[cb.rank], border: `1px solid ${RANK_COLORS[cb.rank]}50` }}
                  >
                    {cb.rank}
                  </div>

                  {/* Artwork */}
                  {cb.icon_url || cb.artwork_url ? (
                    <img
                      src={cb.icon_url || cb.artwork_url}
                      alt={cb.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ptn-disabled text-xs">?</div>
                  )}

                  {/* Unreleased overlay */}
                  {cb.unreleased && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center py-0.5">
                      <span className="text-[10px] font-bold text-white tracking-wider">UNRELEASED</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-ptn-muted text-center mt-1 leading-tight group-hover:text-ptn-text transition-colors line-clamp-2">
                  {cb.name}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

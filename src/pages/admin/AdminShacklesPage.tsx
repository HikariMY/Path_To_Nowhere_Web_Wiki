// @ts-nocheck
import { useEffect, useState } from 'react'
import { Search, Unlink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import type { ShackleBreak } from '../../types/models'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import { JOB_CLASS_LABEL } from '../../lib/constants'
import { ShacklesPanel } from './ShacklesPanel'

export function AdminShacklesPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingChars, setLoadingChars] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)

  useEffect(() => { fetchChars() }, [])

  const fetchChars = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, slug, rarity, faction, job_class, portrait_url, shackles')
      .order('rarity').order('name')
    setCharacters(data || [])
    setLoadingChars(false)
  }

  const handleUpdated = (updated: ShackleBreak[]) => {
    if (!selectedChar) return
    setCharacters(prev => prev.map(c => c.id === selectedChar.id ? { ...c, shackles: updated } : c))
    setSelectedChar(prev => prev ? { ...prev, shackles: updated } : prev)
  }

  const filteredChars = characters.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loadingChars) return <PageLoader />

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── Character selector ─────────────────────────────────────── */}
      <div className="w-60 shrink-0 flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ptn-text">เลือกตัวละคร</h2>
        <Input
          placeholder="ค้นหา..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={13} />}
        />
        <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {filteredChars.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChar(c)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                selectedChar?.id === c.id
                  ? 'bg-ptn-red/10 text-ptn-text border border-ptn-red/30'
                  : 'text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated border border-transparent'
              }`}
            >
              {c.portrait_url && (
                <img src={c.portrait_url} alt={c.name} className="w-7 h-7 rounded object-cover border border-ptn-border shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-ptn-text truncate">{c.name}</div>
                <div className="text-xs text-ptn-muted">{c.rarity}-Rank · {JOB_CLASS_LABEL[c.job_class] || c.job_class}</div>
              </div>
              {Array.isArray(c.shackles) && c.shackles.length > 0 && (
                <span className="ml-auto text-xs text-ptn-cyan shrink-0 font-mono">{c.shackles.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Shackles editor ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {!selectedChar ? (
          <div className="flex flex-col items-center justify-center h-64 text-ptn-muted">
            <Unlink size={32} className="mb-3 opacity-30" />
            <p>เลือกตัวละครเพื่อจัดการ Shackle Break</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              {selectedChar.portrait_url && (
                <img src={selectedChar.portrait_url} alt={selectedChar.name} className="w-10 h-10 rounded object-cover border border-ptn-border" />
              )}
              <div>
                <h1 className="font-heading text-xl font-bold text-ptn-text">{selectedChar.name}</h1>
                <p className="text-sm text-ptn-muted">{selectedChar.rarity}-Rank · Shackle Break</p>
              </div>
            </div>
            <ShacklesPanel character={selectedChar} onUpdated={handleUpdated} />
          </>
        )}
      </div>
    </div>
  )
}

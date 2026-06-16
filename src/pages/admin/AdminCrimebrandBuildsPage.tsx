// @ts-nocheck
import { useState, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CrimebrandBuildsPanel } from './CrimebrandBuildsPanel'

type Character = {
  id: string
  name: string
  portrait_url: string | null
}

export function AdminCrimebrandBuildsPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharId, setSelectedCharId] = useState('')
  const [charDropOpen, setCharDropOpen] = useState(false)
  const [charSearch, setCharSearch] = useState('')

  useEffect(() => {
    supabase.from('characters').select('id,name,portrait_url').order('name')
      .then(({ data }) => setCharacters(data || []))
  }, [])

  const selectedChar = characters.find(c => c.id === selectedCharId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการ Crimebrand Builds</h1>
        <p className="text-sm text-ptn-muted mt-1">กำหนด Crimebrand Set แนะนำสำหรับแต่ละตัวละคร</p>
      </div>

      {/* Character selector — custom dropdown with portrait */}
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-ptn-text mb-1.5">เลือกตัวละคร</label>
        <div className="relative">
          <button
            onClick={() => setCharDropOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-sm text-left hover:border-ptn-red/50 transition-colors"
          >
            {selectedChar ? (
              <>
                {selectedChar.portrait_url ? (
                  <img src={selectedChar.portrait_url} className="w-7 h-7 rounded object-cover object-top shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-ptn-surface flex items-center justify-center shrink-0 text-xs text-ptn-disabled">
                    {selectedChar.name[0]}
                  </div>
                )}
                <span className="flex-1 text-ptn-text truncate">{selectedChar.name}</span>
              </>
            ) : (
              <span className="flex-1 text-ptn-muted">-- เลือกตัวละคร --</span>
            )}
            <ChevronDown size={14} className="text-ptn-muted shrink-0" />
          </button>
          {charDropOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setCharDropOpen(false); setCharSearch('') }} />
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-ptn-border bg-ptn-surface shadow-lg">
                <div className="p-2 border-b border-ptn-border">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-ptn-elevated border border-ptn-border">
                    <Search size={12} className="text-ptn-disabled shrink-0" />
                    <input
                      autoFocus
                      value={charSearch}
                      onChange={e => setCharSearch(e.target.value)}
                      placeholder="ค้นหาตัวละคร..."
                      className="flex-1 bg-transparent text-sm text-ptn-text placeholder-ptn-disabled outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {characters
                    .filter(c => !charSearch || c.name.toLowerCase().includes(charSearch.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCharId(c.id); setCharDropOpen(false); setCharSearch('') }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-ptn-elevated transition-colors ${selectedCharId === c.id ? 'bg-ptn-elevated' : ''}`}
                      >
                        {c.portrait_url ? (
                          <img src={c.portrait_url} className="w-7 h-7 rounded object-cover object-top shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-ptn-elevated flex items-center justify-center shrink-0 text-xs text-ptn-disabled">
                            {c.name[0]}
                          </div>
                        )}
                        <span className="text-ptn-text">{c.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedChar && (
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-ptn-text">{selectedChar.name}</h2>
          <CrimebrandBuildsPanel characterId={selectedCharId} />
        </div>
      )}
    </div>
  )
}

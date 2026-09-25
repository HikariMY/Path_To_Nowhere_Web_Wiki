import { useState } from 'react'
import { GripVertical, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import { JOB_CLASS_LABEL } from '../../lib/constants'
import { filterCharacters } from '../../lib/tierList'
import type { Character } from '../../types'
import { TierCharCard } from './TierParts'

const RARITIES = ['S', 'A', 'B', 'C'] as const

/**
 * รายการตัวละครที่ยังไม่จัดอันดับ — ค้นหา/กรองได้, ติดขอบล่างจอ
 * กดการ์ดเพื่อเลือก (มือถือ) หรือลากไปวาง (จอกว้าง); ตอนเลือกตัวละครในแถวอยู่ กดพื้นที่นี้เพื่อเอาออก
 */
export function CharacterPool({ characters, selected, onSelect, onDragStart, onDragEnd, onDropHere, total }: {
  characters: Character[]
  selected: string | null
  onSelect: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropHere: () => void
  total: number
}) {
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState('')
  const [jobClass, setJobClass] = useState('')

  const shown = filterCharacters(characters, { query, rarity, jobClass })
  const filtering = !!(query || rarity || jobClass)

  return (
    <section
      aria-label="ตัวละครที่ยังไม่ได้จัดอันดับ"
      className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-ptn-border bg-ptn-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onDropHere() }}
      onClick={e => { if (e.target === e.currentTarget && selected) onDropHere() }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ptn-text">
          <GripVertical size={14} className="text-ptn-muted" />
          ยังไม่จัดอันดับ ({filtering ? `${shown.length}/` : ''}{characters.length} จาก {total})
        </h2>
        <label className="relative ml-auto min-w-[10rem] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ptn-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อตัวละคร..."
            aria-label="ค้นหาชื่อตัวละคร"
            className="w-full rounded border border-ptn-border bg-ptn-elevated py-1.5 pl-8 pr-2 text-sm text-ptn-text outline-none focus:border-ptn-cyan"
          />
        </label>
        <div className="flex gap-1" role="group" aria-label="กรอง Rank">
          {RARITIES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRarity(v => (v === r ? '' : r))}
              aria-pressed={rarity === r}
              className={cn(
                'rounded border px-2 py-1 text-xs',
                rarity === r ? 'border-ptn-cyan/50 bg-ptn-cyan/15 text-ptn-cyan' : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <select
          value={jobClass}
          onChange={e => setJobClass(e.target.value)}
          aria-label="กรองคลาส"
          className="rounded border border-ptn-border bg-ptn-elevated px-2 py-1.5 text-xs text-ptn-text outline-none focus:border-ptn-cyan"
        >
          <option value="">ทุกคลาส</option>
          {Object.entries(JOB_CLASS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      <div
        className="flex max-h-[32vh] min-h-[88px] flex-wrap content-start gap-2 overflow-y-auto"
        onClick={e => { if (e.target === e.currentTarget && selected) onDropHere() }}
      >
        {shown.map(c => (
          <button
            key={c.id}
            type="button"
            draggable
            onDragStart={() => onDragStart(c.id)}
            onDragEnd={onDragEnd}
            onClick={() => onSelect(c.id)}
            aria-pressed={selected === c.id}
            className="cursor-grab rounded active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan"
          >
            <TierCharCard char={c} selected={selected === c.id} />
          </button>
        ))}
        {shown.length === 0 && (
          <p className="self-center text-xs text-ptn-disabled">
            {characters.length === 0 ? 'ตัวละครทั้งหมดถูกจัดอันดับแล้ว' : 'ไม่พบตัวละครที่ตรงกับการค้นหา'}
          </p>
        )}
      </div>
    </section>
  )
}

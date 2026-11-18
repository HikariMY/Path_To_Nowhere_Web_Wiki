import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { groupResults, searchItems, KIND_LABEL, type SearchItem } from '../../lib/quickSearch'
import { cn } from '../../lib/utils'
import { loadSearchItems, PAGE_ITEMS } from './searchData'

/** หน้าต่างค้นหาด่วน — ↑↓ เลือก · Enter เปิด · Esc ปิด */
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[] | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadSearchItems().then(rows => { if (!cancelled) setItems(rows) })
    return () => { cancelled = true }
  }, [])

  // ล็อกหน้าหลังไม่ให้เลื่อน · ปิดแล้วคืนค่าเดิม (เผื่อเปิดทับ Modal ที่ล็อกไว้แล้ว) และคืนโฟกัส
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  // ยังไม่พิมพ์ = โชว์เมนูหลักไว้กดไปได้เลย
  const results = useMemo(
    () => (query.trim() ? searchItems([...PAGE_ITEMS, ...(items ?? [])], query) : PAGE_ITEMS),
    [query, items],
  )
  const groups = useMemo(() => groupResults(results), [results])
  const flat = useMemo(() => groups.flatMap(g => g.items), [groups])
  const current = Math.min(active, Math.max(0, flat.length - 1))

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [current, flat])

  const open = (item: SearchItem) => {
    onClose()
    navigate(item.href)
  }

  // ฟังที่ document ทั้งหน้า — ปุ่มยังใช้ได้แม้โฟกัสหลุดจากช่องค้นหา
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(flat.length - 1, current + 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, current - 1)) }
      else if (e.key === 'Enter' && flat[current]) {
        e.preventDefault()
        onClose()
        navigate(flat[current].href)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [flat, current, onClose, navigate])

  const optionId = (i: number) => `${listId}-opt-${i}`

  // portal ไปที่ body — ถ้าอยู่ใน header (sticky + backdrop-blur) พื้นหลังมืดจะถูกจำกัดแค่ความสูงของ header
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหาด่วน"
        className="w-full max-w-xl overflow-hidden rounded-lg border border-ptn-border bg-ptn-surface shadow-ptn-card"
        onMouseDown={e => {
          e.stopPropagation()
          // คลิกที่อื่นในหน้าต่าง (ไม่ใช่ช่องค้นหา) ไม่ให้โฟกัสหลุดจากช่องค้นหา
          if (e.target !== inputRef.current) e.preventDefault()
        }}
      >
        <label className="flex items-center gap-3 border-b border-ptn-border px-4">
          <Search size={18} className="shrink-0 text-ptn-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
            placeholder="ค้นหาตัวละคร Crimebrand โหมด หรือหน้า…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat.length ? optionId(current) : undefined}
            aria-autocomplete="list"
            className="h-12 flex-1 bg-transparent text-sm text-ptn-text outline-none placeholder:text-ptn-disabled"
          />
          <kbd className="hidden rounded border border-ptn-border px-1.5 py-0.5 font-mono text-[10px] text-ptn-muted sm:block">Esc</kbd>
        </label>

        <div ref={listRef} id={listId} role="listbox" aria-label="ผลการค้นหา" className="max-h-[60vh] overflow-y-auto p-2">
          {groups.map(g => (
            <div key={g.kind} role="group" aria-label={KIND_LABEL[g.kind]}>
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ptn-disabled">{KIND_LABEL[g.kind]}</p>
              {g.items.map(item => {
                const i = flat.indexOf(item)
                return (
                  <div
                    key={`${item.kind}:${item.href}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === current}
                    onMouseMove={() => i !== current && setActive(i)}
                    onClick={() => open(item)}
                    className={cn('flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm',
                      i === current ? 'bg-ptn-elevated text-ptn-text' : 'text-ptn-muted')}
                  >
                    {item.img
                      ? <img src={item.img} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded object-cover object-top" />
                      : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-ptn-bg"><ChevronRight size={14} /></span>}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.sub && <span className="shrink-0 text-xs text-ptn-disabled">{item.sub}</span>}
                  </div>
                )
              })}
            </div>
          ))}
          {query.trim() && flat.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-ptn-muted">{items ? 'ไม่พบผลลัพธ์' : 'กำลังโหลด…'}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

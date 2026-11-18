import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ListChecks } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Card } from '../../../components/ui/Card'
import { buildTodos, type TodoInput, type TodoItem, type TodoTone } from '../../../lib/adminTodo'
import { collectSources } from '../../../lib/externalSources'
import { cn } from '../../../lib/utils'

const TONE_DOT: Record<TodoTone, string> = {
  red: 'bg-ptn-red',
  amber: 'bg-ptn-gold',
  blue: 'bg-ptn-cyan',
  green: 'bg-green-400',
}

// ตารางไหนโหลดไม่ได้ (เช่นยังไม่รัน migration) นับเป็น 0 — แดชบอร์ดส่วนอื่นต้องแสดงได้ตามปกติ
async function fetchTodoInput(): Promise<TodoInput> {
  const now = new Date().toISOString()
  const [reports, events, modes, cn, modeSources, tiers, codes] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('events').select('title, end_date, is_active').eq('is_active', true).gt('end_date', now),
    supabase.from('game_modes').select('name, in_global, season_label, season_ends'),
    supabase.from('character_cn_guides').select('id, source_title, source_author, source_url, checked_at, character:characters(name, slug)'),
    supabase.from('game_mode_sources').select('id, title, author, url, checked_at, mode:game_modes(name, slug)'),
    supabase.from('tier_lists').select('id, title, source').eq('is_official', true).not('source', 'is', null),
    supabase.from('redeem_codes').select('code, is_active, expires_at').eq('is_active', true),
  ])
  const sources = collectSources({
    cnGuides: (cn.data || []) as never,
    modeSources: (modeSources.data || []) as never,
    tierLists: (tiers.data || []) as never,
  })
  return {
    openReports: reports.count ?? 0,
    events: (events.data || []) as TodoInput['events'],
    modes: (modes.data || []) as TodoInput['modes'],
    staleSources: sources.filter(s => s.stale).length,
    codes: (codes.data || []) as TodoInput['codes'],
  }
}

/** แดชบอร์ดแอดมิน → งานที่ต้องทำ: นับจากข้อมูลจริง กดแล้วไปหน้าที่ต้องแก้ */
export function AdminTodoPanel() {
  const [todos, setTodos] = useState<TodoItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTodoInput()
      .then(input => { if (!cancelled) setTodos(buildTodos(input)) })
      .catch(() => { if (!cancelled) setTodos([]) })
    return () => { cancelled = true }
  }, [])

  const pending = todos?.reduce((sum, t) => sum + t.count, 0) ?? 0

  return (
    <Card className="mb-8 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-heading font-semibold text-ptn-text">
        <ListChecks size={16} className="text-ptn-muted" />
        งานที่ต้องทำ
        {todos && <span className="text-xs font-normal text-ptn-muted">{pending > 0 ? `${pending} รายการ` : 'เรียบร้อยทุกอย่าง'}</span>}
      </h2>
      {!todos ? (
        <p className="py-4 text-center text-sm text-ptn-muted">กำลังโหลด…</p>
      ) : todos.length === 0 ? (
        <p className="py-4 text-center text-sm text-ptn-muted">โหลดรายการไม่ได้ — ลองรีเฟรชหน้า</p>
      ) : (
        <ul className="divide-y divide-ptn-border">
          {todos.map(t => (
            <li key={t.key}>
              <Link to={t.href} className={cn('group flex items-center gap-3 py-2.5', t.count === 0 && 'opacity-60')}>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', t.count > 0 ? TONE_DOT[t.tone] : 'bg-ptn-border')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ptn-text">{t.label}</span>
                  <span className="block truncate text-xs text-ptn-muted">{t.detail}</span>
                </span>
                <span className={cn('min-w-[2rem] rounded px-2 py-0.5 text-center font-mono text-sm font-semibold',
                  t.count > 0 ? 'bg-ptn-elevated text-ptn-text' : 'text-ptn-disabled')}>
                  {t.count}
                </span>
                <ChevronRight size={14} className="shrink-0 text-ptn-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

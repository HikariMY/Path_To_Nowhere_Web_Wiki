import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ListChecks } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Card } from '../../../components/ui/Card'
import { buildTodos, type TodoInput, type TodoItem, type TodoKey, type TodoTone } from '../../../lib/adminTodo'
import { collectSources } from '../../../lib/externalSources'
import { cn } from '../../../lib/utils'

const TONE_DOT: Record<TodoTone, string> = {
  red: 'bg-ptn-red',
  amber: 'bg-ptn-gold',
  blue: 'bg-ptn-cyan',
  green: 'bg-green-400',
}

// ตารางไหนโหลดไม่ได้ ให้แถวนั้นขึ้น "โหลดไม่ได้" แทน 0 — ห้ามบอกว่าเรียบร้อยทั้งที่ยังไม่รู้
async function fetchTodoInput(): Promise<{ input: TodoInput; failed: Set<TodoKey> }> {
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
  const failedQueries: [TodoKey, unknown][] = [
    ['reports', reports.error], ['events', events.error], ['modes', modes.error],
    ['sources', cn.error || modeSources.error || tiers.error], ['codes', codes.error],
  ]
  return {
    input: {
      openReports: reports.count ?? 0,
      events: (events.data || []) as TodoInput['events'],
      modes: (modes.data || []) as TodoInput['modes'],
      staleSources: sources.filter(s => s.stale).length,
      codes: (codes.data || []) as TodoInput['codes'],
    },
    failed: new Set(failedQueries.filter(([, err]) => err).map(([key]) => key)),
  }
}

/** แดชบอร์ดแอดมิน → งานที่ต้องทำ: นับจากข้อมูลจริง กดแล้วไปหน้าที่ต้องแก้ */
export function AdminTodoPanel() {
  const [todos, setTodos] = useState<TodoItem[] | null>(null)
  const [failed, setFailed] = useState<Set<TodoKey>>(new Set())

  useEffect(() => {
    let cancelled = false
    fetchTodoInput()
      .then(res => {
        if (cancelled) return
        setTodos(buildTodos(res.input))
        setFailed(res.failed)
      })
      .catch(() => { if (!cancelled) setTodos([]) })
    return () => { cancelled = true }
  }, [])

  const pending = todos?.filter(t => !failed.has(t.key)).reduce((sum, t) => sum + t.count, 0) ?? 0
  const summary = failed.size > 0 ? 'บางรายการโหลดไม่ได้' : pending > 0 ? `${pending} รายการ` : 'เรียบร้อยทุกอย่าง'

  return (
    <Card className="mb-8 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-heading font-semibold text-ptn-text">
        <ListChecks size={16} className="text-ptn-muted" />
        งานที่ต้องทำ
        {todos && todos.length > 0 && <span className="text-xs font-normal text-ptn-muted">{summary}</span>}
      </h2>
      {!todos ? (
        <p className="py-4 text-center text-sm text-ptn-muted">กำลังโหลด…</p>
      ) : todos.length === 0 ? (
        <p className="py-4 text-center text-sm text-ptn-muted">โหลดรายการไม่ได้ — ลองรีเฟรชหน้า</p>
      ) : (
        <ul className="divide-y divide-ptn-border">
          {todos.map(t => {
            const loadFailed = failed.has(t.key)
            const hasWork = !loadFailed && t.count > 0
            return (
            <li key={t.key}>
              <Link to={t.href} className={cn('group flex items-center gap-3 py-2.5', !hasWork && !loadFailed && 'opacity-60')}>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', hasWork ? TONE_DOT[t.tone] : loadFailed ? 'bg-red-400' : 'bg-ptn-border')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ptn-text">{t.label}</span>
                  <span className={cn('block truncate text-xs', loadFailed ? 'text-red-400' : 'text-ptn-muted')}>
                    {loadFailed ? 'โหลดไม่ได้ — เปิดหน้านี้เพื่อตรวจเอง' : t.detail}
                  </span>
                </span>
                <span className={cn('min-w-[2rem] rounded px-2 py-0.5 text-center font-mono text-sm font-semibold',
                  hasWork ? 'bg-ptn-elevated text-ptn-text' : 'text-ptn-disabled')}>
                  {loadFailed ? '?' : t.count}
                </span>
                <ChevronRight size={14} className="shrink-0 text-ptn-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

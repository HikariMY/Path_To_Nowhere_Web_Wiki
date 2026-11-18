import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { GameModeRow } from '../../types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { hasCnInfo, readShots, seasonState, MODE_ROUND_WARN_DAYS } from '../../lib/gameModes'
import { ModeStatusBadges, SeasonBadge } from '../modes/ModeParts'
import { ModeEditor } from './modes/ModeEditor'

/** แอดมิน → ไกด์โหมด: รายการโหมด + เปิดตัวแก้ · เตือนรอบที่หมดหรือเหลือไม่เกิน 30 วัน */
export function AdminModesPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [modes, setModes] = useState<GameModeRow[]>([])
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<GameModeRow | 'new' | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data, error }, { data: src }] = await Promise.all([
        supabase.from('game_modes').select('*').order('sort_order').order('name'),
        supabase.from('game_mode_sources').select('mode_id'),
      ])
      if (cancelled) return
      setLoadError(error ? 'โหลดไม่ได้ — ตรวจว่ารัน supabase_migration_game_modes.sql แล้วหรือยัง' : null)
      setModes((data || []) as GameModeRow[])
      const counts: Record<string, number> = {}
      for (const s of (src || []) as { mode_id: string }[]) counts[s.mode_id] = (counts[s.mode_id] ?? 0) + 1
      setSourceCounts(counts)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [reloadKey])

  const handleDelete = async (m: GameModeRow) => {
    if (!confirm(`ลบไกด์โหมด "${m.name}"? แหล่งอ้างอิงของโหมดนี้จะถูกลบไปด้วย`)) return
    const { error } = await supabase.from('game_modes').delete().eq('id', m.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    if (profile) await supabase.from('admin_logs').insert({ admin_id: profile.id, action: `ลบไกด์โหมด: ${m.name}`, target_table: 'game_modes', target_id: m.id } as never)
    toast('ลบแล้ว', 'success')
    reload()
  }

  if (loading) return <PageLoader />

  // เตือนเฉพาะโหมดที่มีใน Global (หน้าเว็บแสดงรอบเฉพาะโหมดเหล่านี้)
  const rounds = modes.filter(m => m.in_global && ['ended', 'ending'].includes(seasonState(m.season_ends).state))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ptn-text">ไกด์โหมด</h1>
          <p className="text-sm text-ptn-muted">สรุปวิธีเล่นและรอบปัจจุบันของแต่ละโหมด แสดงในเมนู "ไกด์โหมด" ของหน้าเว็บ</p>
        </div>
        <Button onClick={() => setEditing('new')} disabled={!!loadError}><Plus size={14} /> เพิ่มโหมด</Button>
      </div>

      {loadError && <Card className="mb-4 p-4 text-sm text-red-400">{loadError}</Card>}

      {rounds.length > 0 && (
        <Card className="mb-4 border-l-2 border-l-ptn-gold p-4 text-sm">
          <b className="text-ptn-gold">รอบที่หมดหรือจะหมดใน {MODE_ROUND_WARN_DAYS} วัน:</b>{' '}
          <span className="text-ptn-text">{rounds.map(m => `${m.name} (${m.season_label})`).join(' · ')}</span>
          <span className="block text-xs text-ptn-muted">อัปเดต Stage / Trait / Boss / วันสิ้นสุด เมื่อขึ้นรอบใหม่</span>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-ptn-border bg-ptn-elevated/50">
            <tr>
              {['โหมด', 'อยู่ในเมนู', 'สถานะ', 'รอบปัจจุบัน (Global)', 'แหล่งอ้างอิง', ''].map(h => (
                <th key={h} className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-ptn-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modes.map(m => (
              <tr key={m.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                <td className="p-3">
                  <b className="text-ptn-text">{m.name}</b>
                  {m.cn_name && <span className="ml-1.5 text-xs text-ptn-disabled">{m.cn_name}</span>}
                  <span className="block font-mono text-[11px] text-ptn-disabled">/modes/{m.slug}</span>
                </td>
                <td className="p-3 text-xs text-ptn-muted">{m.global_menu || '—'}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <ModeStatusBadges mode={m} />
                    {hasCnInfo(m) && <span className="rounded border border-ptn-red/25 bg-ptn-red/10 px-2 py-0.5 text-xs text-ptn-red">CN</span>}
                    {readShots(m.shots).length > 0 && <span className="rounded border border-ptn-border px-2 py-0.5 text-xs text-ptn-muted">ภาพ {readShots(m.shots).length}</span>}
                  </div>
                </td>
                <td className="p-3">{m.season_label ? <SeasonBadge mode={m} /> : <span className="text-xs text-ptn-disabled">ไม่หมุนเวียน</span>}</td>
                <td className="p-3 font-mono text-xs text-ptn-muted">{sourceCounts[m.id] ?? <span className="font-sans">ในเกม</span>}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-0.5">
                    <Link to={`/modes/${m.slug}`} target="_blank" title="ดูหน้าเว็บ" className="p-1.5 text-ptn-muted hover:text-ptn-text"><Eye size={14} /></Link>
                    <button type="button" onClick={() => setEditing(m)} title="แก้ไข" className="p-1.5 text-ptn-muted hover:text-ptn-text"><Edit2 size={14} /></button>
                    <button type="button" onClick={() => handleDelete(m)} title="ลบ" className="p-1.5 text-ptn-muted hover:text-ptn-red"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {modes.length === 0 && !loadError && (
              <tr><td colSpan={6} className="p-8 text-center text-ptn-muted">ยังไม่มีไกด์โหมด — รัน supabase_seed_game_modes.sql เพื่อใส่เนื้อหาเริ่มต้น หรือกด "เพิ่มโหมด"</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} size="xl" title={editing === 'new' ? 'เพิ่มโหมด' : editing ? `แก้ไข ${editing.name}` : ''}>
        {editing !== null && (
          <ModeEditor
            key={editing === 'new' ? 'new' : editing.id}
            mode={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); reload() }}
          />
        )}
      </Modal>
    </div>
  )
}

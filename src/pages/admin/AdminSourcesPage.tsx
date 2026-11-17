import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ExternalLink, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { CN_STALE_DAYS } from '../../lib/cnGuides'
import { collectSources, type ExternalSource } from '../../lib/externalSources'
import { cn } from '../../lib/utils'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const KIND_LABEL: Record<ExternalSource['kind'], string> = { 'cn-guide': 'ไกด์จีน', mode: 'ไกด์โหมด', 'tier-list': 'เทียร์ลิสต์' }

/**
 * แหล่งอ้างอิงภายนอก: รวมเครดิตทุกที่ (ไกด์จีน · ไกด์โหมด · เทียร์ลิสต์ทางการ)
 * ข้อมูลเกมเปลี่ยนตามแพตช์ — เตือนเมื่อไม่ได้ตรวจกับต้นฉบับเกิน 60 วัน แล้วกด "ตรวจแล้ว"
 */
export function AdminSourcesPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<ExternalSource[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [onlyStale, setOnlyStale] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [cn, modes, tiers] = await Promise.all([
        supabase.from('character_cn_guides').select('id, source_title, source_author, source_url, checked_at, character:characters(name, slug)'),
        supabase.from('game_mode_sources').select('id, title, author, url, checked_at, mode:game_modes(name, slug)'),
        supabase.from('tier_lists').select('id, title, source').eq('is_official', true).not('source', 'is', null),
      ])
      if (cancelled) return
      // ตารางที่ยังไม่ได้รัน migration โหลดไม่ได้ — ข้ามส่วนนั้น แสดงที่เหลือ
      setMissing([cn.error && 'ไกด์จีน', modes.error && 'ไกด์โหมด', tiers.error && 'เทียร์ลิสต์'].filter(Boolean) as string[])
      setRows(collectSources({
        cnGuides: (cn.data || []) as never,
        modeSources: (modes.data || []) as never,
        tierLists: (tiers.data || []) as never,
      }))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [reloadKey])

  const markChecked = async (row: ExternalSource) => {
    const table = row.kind === 'cn-guide' ? 'character_cn_guides' : 'game_mode_sources'
    const { error } = await supabase.from(table).update({ checked_at: today() } as never).eq('id', row.id)
    if (error) { toast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return }
    if (profile) await supabase.from('admin_logs').insert({ admin_id: profile.id, action: `ตรวจแหล่งอ้างอิงกับต้นฉบับแล้ว: ${row.title}`, target_table: table, target_id: row.id } as never)
    toast('บันทึกว่าตรวจแล้ววันนี้', 'success')
    reload()
  }

  if (loading) return <PageLoader />

  const q = query.trim().toLowerCase()
  const staleCount = rows.filter(r => r.stale).length
  const shown = rows.filter(r => (!onlyStale || r.stale) && (!q || `${r.title} ${r.author} ${r.usedAt.label}`.toLowerCase().includes(q)))

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">แหล่งอ้างอิงภายนอก</h1>
        <p className="text-sm text-ptn-muted">
          ทุกสรุปจากเว็บภายนอกต้องมีเครดิตและลิงก์ · เตือนเมื่อไม่ได้ตรวจกับต้นฉบับเกิน {CN_STALE_DAYS} วัน (ข้อมูลเกมเปลี่ยนตามแพตช์) · แก้เครดิตได้ที่หน้าที่ใช้งาน
        </p>
      </div>

      {missing.length > 0 && (
        <Card className="mb-4 p-3 text-sm text-ptn-gold">ยังโหลดส่วนนี้ไม่ได้ (อาจยังไม่ได้รัน migration): {missing.join(' · ')}</Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="ค้นหาชื่อ ผู้เขียน หรือหน้าที่ใช้..." value={query} onChange={e => setQuery(e.target.value)} icon={<Search size={14} />} className="max-w-sm" />
        <div className="flex rounded border border-ptn-border p-0.5 text-sm">
          {([[false, `ทั้งหมด (${rows.length})`], [true, `ต้องตรวจใหม่ (${staleCount})`]] as const).map(([v, label]) => (
            <button key={label} type="button" onClick={() => setOnlyStale(v)} className={cn('rounded px-3 py-1', onlyStale === v ? 'bg-ptn-red text-white' : 'text-ptn-muted hover:text-ptn-text')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-ptn-border bg-ptn-elevated/50">
            <tr>
              {['ต้นฉบับ', 'ผู้เขียน', 'ใช้ที่', 'ตรวจล่าสุด', ''].map(h => (
                <th key={h} className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-ptn-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(r => (
              <tr key={`${r.kind}-${r.id}`} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                <td className="p-3">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-ptn-cyan hover:underline">
                    <ExternalLink size={12} className="mt-1 shrink-0" /> <span className="break-words">{r.title}</span>
                  </a>
                </td>
                <td className="p-3 text-xs text-ptn-muted">{r.author}</td>
                <td className="p-3 text-xs">
                  <span className="mr-1 rounded border border-ptn-border px-1.5 py-0.5 text-[11px] text-ptn-muted">{KIND_LABEL[r.kind]}</span>
                  <Link to={r.usedAt.href} target="_blank" className="text-ptn-text hover:underline">{r.usedAt.label}</Link>
                </td>
                <td className="p-3">
                  <span className={cn('rounded px-2 py-0.5 text-xs', r.stale ? 'bg-ptn-gold/15 text-ptn-gold' : 'bg-emerald-400/10 text-emerald-400')}>
                    {r.checkedAt ?? '—'}{r.stale ? ' · ต้องตรวจใหม่' : ''}
                  </span>
                  {!r.canMarkChecked && <span className="block text-[11px] text-ptn-disabled">วันที่ของต้นฉบับ</span>}
                </td>
                <td className="p-3 text-right">
                  {r.canMarkChecked && (
                    <button type="button" onClick={() => markChecked(r)} title="ตรวจกับต้นฉบับแล้ววันนี้" className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ptn-muted hover:bg-ptn-elevated hover:text-emerald-400">
                      <CheckCircle2 size={13} /> ตรวจแล้ว
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-ptn-muted">{rows.length ? 'ไม่พบที่ตรงกับตัวกรอง' : 'ยังไม่มีแหล่งอ้างอิงภายนอก'}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

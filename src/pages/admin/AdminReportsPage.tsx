import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { formatRelativeTime } from '../../lib/utils'
import {
  REPORT_REASONS, REPORT_TARGET_LABEL, groupReports, reportTargetHref,
  type ReportGroup, type ReportStatus, type ReportTargetType,
} from '../../lib/moderation'
import type { ReportRow } from '../../types/database.types'

type OpenReport = Pick<ReportRow,
  'id' | 'target_type' | 'target_id' | 'reason' | 'detail' | 'created_at' | 'source' | 'ai_scores'> & {
  reporter: { username: string } | null
}

interface TargetPreview {
  text: string
  href: string | null
}

const REASON_LABEL = new Map(REPORT_REASONS.map(r => [r.value, r.label]))
const MAX_REPORTS = 300

/** embed แบบ many-to-one บางทีมาเป็น array — เอาตัวแรก */
const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null)
const snippet = (text: string) => (text.length > 120 ? `${text.slice(0, 120)}…` : text)

/** ดึงหัวข้อ/ข้อความของเนื้อหาที่ถูกรายงาน + ลิงก์ไปดู — key = "<type>:<id>" */
async function fetchPreviews(groups: readonly ReportGroup[]): Promise<Map<string, TargetPreview>> {
  const idsOf = (type: ReportTargetType) => groups.filter(g => g.target_type === type).map(g => g.target_id)
  const previews = new Map<string, TargetPreview>()
  const put = (type: ReportTargetType, id: string, text: string, info: Parameters<typeof reportTargetHref>[1]) =>
    previews.set(`${type}:${id}`, { text, href: reportTargetHref(type, info) })

  const posts = idsOf('forum_post'), replies = idsOf('forum_reply'), tiers = idsOf('tier_list'), guides = idsOf('character_guide')
  const [postsRes, repliesRes, tiersRes, guidesRes] = await Promise.all([
    posts.length ? supabase.from('forum_posts').select('id, title, category:forum_categories(slug)').in('id', posts) : null,
    replies.length
      ? supabase.from('forum_replies').select('id, content, post_id, post:forum_posts(category:forum_categories(slug))').in('id', replies)
      : null,
    tiers.length ? supabase.from('tier_lists').select('id, title').in('id', tiers) : null,
    guides.length ? supabase.from('character_guides').select('id, title, character:characters(slug)').in('id', guides) : null,
  ])

  for (const p of postsRes?.data ?? []) {
    put('forum_post', p.id, p.title, { id: p.id, categorySlug: one(p.category)?.slug })
  }
  for (const r of repliesRes?.data ?? []) {
    const categorySlug = one(one(r.post)?.category)?.slug
    put('forum_reply', r.id, snippet(r.content), { id: r.id, postId: r.post_id, categorySlug })
  }
  for (const t of tiersRes?.data ?? []) put('tier_list', t.id, t.title, { id: t.id })
  for (const g of guidesRes?.data ?? []) {
    put('character_guide', g.id, g.title, { id: g.id, characterSlug: one(g.character)?.slug })
  }
  return previews
}

async function loadOpenReports(): Promise<{ groups: ReportGroup<OpenReport>[]; previews: Map<string, TargetPreview> }> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, detail, created_at, source, ai_scores, reporter:profiles(username)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(MAX_REPORTS)
  if (error) throw error
  const groups = groupReports(
    (data ?? []).map(r => ({ ...r, reporter: one(r.reporter) })) as OpenReport[],
  )
  return { groups, previews: await fetchPreviews(groups) }
}

/** รายงานที่ยังเปิดอยู่ รวมตามเนื้อหา — ปิดเรื่องได้ทีละเนื้อหา (ทุกรายงานของเนื้อหานั้นพร้อมกัน) */
export function AdminReportsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [state, setState] = useState<Awaited<ReturnType<typeof loadOpenReports>> | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadOpenReports()
      .then(data => { if (active) { setState(data); setFailed(false) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [reloadKey])

  const closeGroup = async (group: ReportGroup<OpenReport>, status: Exclude<ReportStatus, 'open'>) => {
    if (!user) return
    setBusyKey(group.key)
    // resolved_by / resolved_at ตั้งให้เองใน trigger guard_report_update
    const { data, error } = await supabase
      .from('reports')
      .update({ status })
      .eq('target_type', group.target_type)
      .eq('target_id', group.target_id)
      .eq('status', 'open')
      .select('id')
    setBusyKey(null)
    if (error) { toast('ปิดเรื่องไม่สำเร็จ: ' + error.message, 'error'); return }
    setState(prev => prev && { ...prev, groups: prev.groups.filter(g => g.key !== group.key) })
    if (data.length === 0) { toast('เรื่องนี้ถูกปิดไปแล้ว (อาจมีทีมงานคนอื่นจัดการก่อน)', 'info'); return }
    toast(status === 'resolved' ? 'บันทึกว่าจัดการแล้ว' : 'ปิดเรื่องแล้ว (ไม่มีปัญหา)', 'success')
  }

  if (failed) {
    return (
      <Card className="p-6 text-center text-sm text-ptn-muted">
        โหลดรายงานไม่สำเร็จ
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={() => { setFailed(false); setReloadKey(k => k + 1) }}>ลองใหม่</Button>
        </div>
      </Card>
    )
  }
  if (!state) return <PageLoader />

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-1 flex items-center gap-2">
        <Flag size={22} className="text-ptn-red" /> รายงานจากผู้ใช้
      </h1>
      <p className="text-sm text-ptn-muted mb-5">
        เนื้อหาที่ยังรอตรวจ {state.groups.length} รายการ — ถูกรายงานบ่อยสุดขึ้นก่อน
        ถ้าต้องลบ ให้เปิดไปที่เนื้อหาแล้วลบจากหน้านั้น แล้วค่อยกด "จัดการแล้ว"
      </p>

      {state.groups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ptn-muted">ไม่มีรายงานค้างอยู่</Card>
      ) : (
        <div className="space-y-3">
          {state.groups.map(group => {
            const preview = state.previews.get(group.key)
            const aiReport = group.reports.find(r => r.source === 'ai')
            return (
              <Card key={group.key} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-ptn-elevated px-1.5 py-0.5 text-ptn-muted">{REPORT_TARGET_LABEL[group.target_type]}</span>
                      <span className="font-medium text-ptn-red">ถูกรายงาน {group.reports.length} ครั้ง</span>
                      {aiReport && (
                        <span
                          className="rounded bg-ptn-purple/15 px-1.5 py-0.5 text-ptn-purple"
                          title="TypeSafe ประเมินอัตโนมัติ — ภาษาไทยยังคลาดเคลื่อนได้ ตรวจด้วยตาก่อนตัดสิน"
                        >
                          AI ตรวจพบ
                          {aiReport.ai_scores && ` · ${Object.entries(aiReport.ai_scores)
                            .sort(([, a], [, b]) => b - a)
                            .map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
                            .join(', ')}`}
                        </span>
                      )}
                      <span className="text-ptn-disabled">ล่าสุด {formatRelativeTime(group.latest)}</span>
                    </div>
                    {preview ? (
                      <p className="text-sm text-ptn-text break-words">{preview.text}</p>
                    ) : (
                      <p className="text-sm italic text-ptn-disabled">เนื้อหาถูกลบไปแล้ว</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(group.reasonCounts).map(([reason, count]) => (
                        <span key={reason} className="rounded bg-ptn-red/10 px-1.5 py-0.5 text-[11px] text-ptn-red">
                          {REASON_LABEL.get(reason as OpenReport['reason'])} × {count}
                        </span>
                      ))}
                    </div>
                    <ul className="mt-2 space-y-0.5 text-xs text-ptn-muted">
                      {group.reports.filter(r => r.detail && r.source === 'user').map(r => (
                        <li key={r.id} className="break-words">
                          <span className="text-ptn-text">{r.reporter?.username ?? 'ไม่ทราบ'}:</span> {r.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {preview?.href && (
                      <Link
                        to={preview.href}
                        target="_blank"
                        className="flex items-center gap-1 rounded border border-ptn-border px-2.5 py-1.5 text-xs text-ptn-muted hover:text-ptn-text"
                      >
                        <ExternalLink size={12} /> เปิดดู
                      </Link>
                    )}
                    <Button size="sm" variant="cyan" loading={busyKey === group.key} disabled={busyKey !== null}
                      onClick={() => closeGroup(group, 'resolved')}>
                      <Check size={13} /> จัดการแล้ว
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busyKey !== null} onClick={() => closeGroup(group, 'dismissed')}>
                      <X size={13} /> ไม่เป็นไร
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PenLine, ThumbsUp, LogIn } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { GuideView, type GuideWithAuthor, type TeamMate } from '../../components/guides/GuideView'
import { GuideEditor } from '../../components/guides/GuideEditor'
import {
  blankDraft, draftFromGuide,
  type GuideDraft, type EcbOption, type CharOption,
} from '../../components/guides/guideDraft'
import type { CharacterSkill, ShackleBreak } from '../../types/models'
import { cn, formatRelativeTime } from '../../lib/utils'

export function CharacterGuidesTab({ characterId, skills, shackles }: {
  characterId: string
  skills: CharacterSkill[]
  shackles: ShackleBreak[]
}) {
  const { user, profile, isAdmin } = useAuth()
  const { toast } = useToast()

  const [guides, setGuides] = useState<GuideWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [voting, setVoting] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<GuideDraft>(blankDraft())
  const [saving, setSaving] = useState(false)

  // ตัวเลือกที่ใช้ในตัวแก้ไข + ใช้แปลง id เป็นชื่อตอนแสดงผล
  const [ecbOptions, setEcbOptions] = useState<EcbOption[]>([])
  const [charOptions, setCharOptions] = useState<CharOption[]>([])
  const [teamInfo, setTeamInfo] = useState<Record<string, TeamMate>>({})

  // bump เพื่อสั่งโหลดใหม่หลังบันทึก/ลบ — เลี่ยงการเรียก setState แบบ sync ใน effect
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('character_guides')
        .select('*, author:profiles(id, username, display_name, avatar_url, role)')
        .eq('character_id', characterId)
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        // อย่าโยน error ดิบของ Postgres ใส่หน้าคนอ่าน — เก็บไว้ใน console พอ
        console.error('โหลดไกด์ไม่สำเร็จ:', error)
        setLoadError('โหลดไกด์ไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง')
        setLoading(false)
        return
      }
      setLoadError(null)
      const rows = (data || []) as unknown as GuideWithAuthor[]
      setGuides(rows)
      setSelectedId(prev => (prev && rows.some(g => g.id === prev)) ? prev : rows[0]?.id ?? null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [characterId, reloadKey])

  // โหวตของเราเอง — ใช้ทำปุ่มให้เป็นสถานะกดแล้ว
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('character_guide_votes').select('guide_id').eq('user_id', user.id)
      .then(({ data }) => {
        if (!cancelled) setVotedIds(new Set((data || []).map(v => v.guide_id as string)))
      })
    return () => { cancelled = true }
  }, [user])

  // ตัวเลือก Crimebrand / ตัวละคร โหลดครั้งเดียว
  useEffect(() => {
    supabase.from('crimebrands').select('id,name').order('release_order', { ascending: false })
      .then(({ data }) => setEcbOptions((data || []) as EcbOption[]))
    supabase.from('characters').select('id,name,slug,portrait_url').order('name')
      .then(({ data }) => {
        const rows = (data || []) as (CharOption & { slug: string })[]
        setCharOptions(rows)
        setTeamInfo(Object.fromEntries(rows.map(c => [c.id, c as TeamMate])))
      })
  }, [])

  const selected = guides.find(g => g.id === selectedId) || null

  const openCreate = () => {
    setEditingId(null)
    setDraft(blankDraft())
    setEditorOpen(true)
  }

  const openEdit = (g: GuideWithAuthor) => {
    setEditingId(g.id)
    setDraft(draftFromGuide(g))
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    if (!draft.title.trim()) { toast('กรุณาตั้งชื่อไกด์', 'error'); return }
    const sections = draft.sections.filter(s => s.heading.trim() || s.body.trim())
    if (sections.length === 0) { toast('เขียนเนื้อหาอย่างน้อย 1 หัวข้อ', 'error'); return }

    setSaving(true)
    const payload = {
      character_id: characterId,
      author_id: user.id,
      title: draft.title.trim(),
      patch_version: draft.patch_version.trim() || null,
      tags: draft.tags,
      skill_priority: draft.skill_priority,
      level_from: draft.level_from.trim() || null,
      level_to: draft.level_to.trim() || null,
      notable_shackles: draft.notable_shackles,
      recommended_ecb_id: draft.recommended_ecb_id || null,
      recommended_team: draft.recommended_team,
      sections,
      updated_at: new Date().toISOString(),
    }

    const res = editingId
      ? await supabase.from('character_guides').update(payload).eq('id', editingId)
      : await supabase.from('character_guides').insert(payload)

    setSaving(false)
    if (res.error) { toast('บันทึกไม่สำเร็จ: ' + res.error.message, 'error'); return }
    toast(editingId ? 'อัปเดตไกด์แล้ว' : 'เผยแพร่ไกด์แล้ว', 'success')
    setEditorOpen(false)
    reload()
  }

  const handleDelete = async (g: GuideWithAuthor) => {
    if (!confirm(`ลบไกด์ "${g.title}"?`)) return
    const { error } = await supabase.from('character_guides').delete().eq('id', g.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    toast('ลบไกด์แล้ว', 'success')
    setGuides(prev => prev.filter(x => x.id !== g.id))
    if (selectedId === g.id) setSelectedId(null)
  }

  const handleVote = async (g: GuideWithAuthor) => {
    if (!user) { toast('เข้าสู่ระบบก่อนจึงจะโหวตได้', 'error'); return }
    setVoting(g.id)
    const already = votedIds.has(g.id)
    const { error } = already
      ? await supabase.from('character_guide_votes').delete().eq('guide_id', g.id).eq('user_id', user.id)
      : await supabase.from('character_guide_votes').insert({ guide_id: g.id, user_id: user.id })
    setVoting(null)
    if (error) { toast(error.message, 'error'); return }

    setVotedIds(prev => {
      const next = new Set(prev)
      if (already) next.delete(g.id); else next.add(g.id)
      return next
    })
    setGuides(prev => prev.map(x => x.id === g.id ? { ...x, upvotes: x.upvotes + (already ? -1 : 1) } : x))
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  const canEdit = (g: GuideWithAuthor) => !!user && (g.author_id === user.id || isAdmin)
  const others = guides.filter(g => g.id !== selectedId)

  return (
    <div className="space-y-4">
      {/* แถบหัว — เขียนไกด์ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ptn-border bg-ptn-surface px-4 py-3">
        <div>
          <p className="font-heading font-bold text-ptn-text">ไกด์โดยผู้เล่น</p>
          <p className="text-xs text-ptn-muted">
            {guides.length > 0
              ? `มี ${guides.length} ไกด์ · เรียงตามคะแนนโหวต`
              : 'ยังไม่มีใครเขียนไกด์ให้ตัวละครนี้'}
          </p>
        </div>
        {user && profile ? (
          <Button size="sm" onClick={openCreate}><PenLine size={14} /> เขียนไกด์</Button>
        ) : (
          <Link to="/login">
            <Button size="sm" variant="secondary"><LogIn size={14} /> เข้าสู่ระบบเพื่อเขียนไกด์</Button>
          </Link>
        )}
      </div>

      {loadError && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4 text-center text-sm text-amber-400">
          {loadError}
        </Card>
      )}

      {!loadError && guides.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-ptn-muted">ยังไม่มีไกด์สำหรับตัวละครนี้</p>
          <p className="mt-1 text-sm text-ptn-disabled">
            {user ? 'เป็นคนแรกที่เขียนได้เลย' : 'เข้าสู่ระบบแล้วมาเป็นคนแรกที่เขียนได้เลย'}
          </p>
        </Card>
      )}

      {selected && (
        <GuideView
          guide={selected}
          skills={skills}
          shackles={shackles}
          ecbName={ecbOptions.find(c => c.id === selected.recommended_ecb_id)?.name ?? null}
          team={selected.recommended_team.map(id => teamInfo[id]).filter(Boolean)}
          voted={votedIds.has(selected.id)}
          voting={voting === selected.id}
          onVote={() => handleVote(selected)}
          canEdit={canEdit(selected)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {/* ไกด์อื่น ๆ — คลิกเพื่อสลับมาอ่าน */}
      {others.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ptn-muted">
            ไกด์อื่นของตัวละครนี้ ({others.length})
          </p>
          <div className="space-y-2">
            {others.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border border-ptn-border bg-ptn-surface px-3 py-2.5 text-left',
                  'transition-colors hover:border-ptn-red/40 hover:bg-ptn-elevated',
                )}
              >
                <span className="flex shrink-0 items-center gap-1 rounded border border-ptn-border px-2 py-1 text-xs text-ptn-muted">
                  <ThumbsUp size={11} />{g.upvotes}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ptn-text">{g.title}</span>
                  <span className="block truncate text-xs text-ptn-muted">
                    โดย {g.author?.display_name || g.author?.username || 'ไม่ทราบ'} · {formatRelativeTime(g.updated_at)}
                    {g.patch_version ? ` · แพตช์ ${g.patch_version}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <GuideEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onSave={handleSave}
        saving={saving}
        editing={!!editingId}
        skills={skills}
        shackles={shackles}
        ecbOptions={ecbOptions}
        charOptions={charOptions}
      />
    </div>
  )
}

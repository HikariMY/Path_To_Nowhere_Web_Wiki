import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Edit2, Lock, Share2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { TierCharCard } from '../../components/tier-lists/TierParts'
import { BuildBadge, TeamSummaryPanel } from '../../components/teams/TeamParts'
import { useTeamCatalog } from '../../hooks/useTeamCatalog'
import { memberBuild, parseMembers, type TeamMember } from '../../lib/team'
import { formatRelativeTime } from '../../lib/utils'
import type { Profile } from '../../types'
import type { TeamRow } from '../../types/database.types'

type TeamView = Omit<TeamRow, 'members'> & {
  members: TeamMember[]
  author: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null
}

/** หน้าดูทีม — ลิงก์นี้ใช้แชร์ */
export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { catalog, failed, retry } = useTeamCatalog()
  const [team, setTeam] = useState<TeamView | null | 'missing'>(null)

  useEffect(() => {
    let active = true
    supabase.from('teams').select('*, author:profiles(username, display_name, avatar_url)').eq('id', id!).maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (!data) { setTeam('missing'); return }
        const author = Array.isArray(data.author) ? data.author[0] ?? null : data.author
        setTeam({ ...data, author, members: parseMembers(data.members) })
      })
    return () => { active = false }
  }, [id])

  if (team === 'missing') {
    return (
      <div className="py-20 text-center text-ptn-muted">
        ไม่พบทีมนี้ (อาจถูกลบ หรือเจ้าของตั้งเป็นส่วนตัว)
        <div className="mt-3"><Link to="/teams" className="text-ptn-cyan hover:underline">ดูทีมทั้งหมด</Link></div>
      </div>
    )
  }
  if (failed) {
    return (
      <div className="py-20 text-center text-sm text-ptn-muted">
        โหลดข้อมูลตัวละครไม่สำเร็จ
        <div className="mt-3"><Button size="sm" variant="outline" onClick={retry}>ลองใหม่</Button></div>
      </div>
    )
  }
  if (!team || !catalog) return <PageLoader />

  const isOwner = user?.id === team.author_id

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast('คัดลอกลิงก์ทีมแล้ว', 'success')
    } catch {
      toast(`คัดลอกไม่ได้ — ลิงก์: ${url}`, 'info')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`ลบทีม "${team.title}"?`)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    toast('ลบทีมแล้ว', 'success')
    navigate('/teams')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/teams" className="mb-4 flex w-fit items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text">
        <ChevronLeft size={16} /> ทีมทั้งหมด
      </Link>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-ptn-text">
              {team.title}
              {!team.is_public && (
                <span title="ทีมส่วนตัว — เห็นแค่คุณ" className="text-ptn-muted"><Lock size={16} /></span>
              )}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ptn-muted">
              {team.author && (
                <Link to={`/profile/${team.author.username}`} className="flex items-center gap-1.5 hover:text-ptn-text">
                  <Avatar src={team.author.avatar_url} username={team.author.username} size="sm" />
                  {team.author.display_name || team.author.username}
                </Link>
              )}
              <span>· อัปเดต {formatRelativeTime(team.updated_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {team.is_public && (
              <Button size="sm" variant="outline" onClick={handleShare}><Share2 size={13} /> แชร์ลิงก์</Button>
            )}
            {isOwner && (
              <Link to={`/teams/${team.id}/edit`}><Button size="sm" variant="ghost"><Edit2 size={13} /> แก้ไข</Button></Link>
            )}
            {(isOwner || isAdmin) && (
              <Button size="sm" variant="danger" onClick={handleDelete}><Trash2 size={13} /> ลบ</Button>
            )}
          </div>
        </div>
        {team.description && <p className="mt-3 whitespace-pre-line text-sm text-ptn-muted">{team.description}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <section aria-label="ตัวละครในทีม" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {team.members.map(member => {
            const char = catalog.charById.get(member.character_id)
            const build = memberBuild(member, catalog.buildById)
            return (
              <Card key={member.character_id} className="flex flex-col gap-2 p-2">
                {char ? (
                  <Link to={`/characters/${char.slug}`} className="w-fit"><TierCharCard char={char} /></Link>
                ) : (
                  <span className="text-xs text-ptn-muted">ตัวละครถูกลบ</span>
                )}
                {build
                  ? <BuildBadge build={build} cbById={catalog.cbById} />
                  : <p className="text-[11px] text-ptn-disabled">ไม่ระบุ Crimebrand</p>}
              </Card>
            )
          })}
        </section>
        <div className="md:sticky md:top-20 md:self-start">
          <TeamSummaryPanel members={team.members} catalog={catalog} />
        </div>
      </div>
    </div>
  )
}

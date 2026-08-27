import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown, ThumbsUp, Pencil, Trash2, ListOrdered,
  BarChart3, Link2, Gem, Users, AlertTriangle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CharacterGuideRow } from '../../types/database.types'
import type { CharacterSkill, ShackleBreak } from '../../types/models'
import { Card } from '../ui/Card'
import { Avatar } from '../ui/Avatar'
import { cn, daysSince, formatRelativeTime } from '../../lib/utils'

/** ไกด์ที่เก่ากว่านี้ (วัน) จะขึ้นป้ายเตือนว่าอาจล้าสมัย */
const STALE_AFTER_DAYS = 120

export type GuideAuthor = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: string
}

export type GuideWithAuthor = CharacterGuideRow & {
  author?: GuideAuthor | null
}

/** ตัวละครที่ถูกอ้างถึงในช่อง "ทีมที่แนะนำ" */
export type TeamMate = { id: string; name: string; slug: string; portrait_url: string | null }

function InvestmentRow({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-ptn-border bg-ptn-elevated/60 px-3 py-2.5">
      <Icon size={15} className="text-ptn-muted shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-ptn-muted">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-ptn-text break-words">{children}</div>
      </div>
    </div>
  )
}

/** กล่องสรุปการลงทุน — อ่านครั้งเดียวรู้ว่าต้องอัปอะไรก่อน */
function InvestmentBox({ guide, skills, shackles, ecbName, team }: {
  guide: GuideWithAuthor
  skills: CharacterSkill[]
  shackles: ShackleBreak[]
  ecbName: string | null
  team: TeamMate[]
}) {
  // skill_priority เก็บ id ไว้ — map กลับเป็นชื่อสกิลจริง เผื่อสกิลถูกลบไปแล้วก็ยังไม่พัง
  const priority = guide.skill_priority
    .map(key => skills.find(s => (s.id ?? s.name) === key))
    .filter((s): s is CharacterSkill => !!s)

  const notable = guide.notable_shackles
    .map(stage => ({ stage, data: shackles.find(s => s.stage === stage) }))

  const hasAny = priority.length > 0 || guide.level_from || guide.level_to
    || notable.length > 0 || ecbName || team.length > 0
  if (!hasAny) return null

  return (
    <div className="rounded-lg border border-ptn-border bg-ptn-surface p-3">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-ptn-muted">
        สรุปการลงทุนที่แนะนำ
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {priority.length > 0 && (
          <InvestmentRow icon={ListOrdered} label="ลำดับการอัปสกิล">
            <span className="flex flex-wrap items-center gap-1">
              {priority.map((s, i) => (
                <span key={(s.id ?? s.name) + i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-ptn-disabled">›</span>}
                  <span className="rounded bg-ptn-bg px-1.5 py-0.5 text-xs">{s.name}</span>
                </span>
              ))}
            </span>
          </InvestmentRow>
        )}

        {(guide.level_from || guide.level_to) && (
          <InvestmentRow icon={BarChart3} label="เลเวลสกิล">
            <span className="font-mono">
              {guide.level_from || '—'} <span className="text-ptn-muted">→</span> {guide.level_to || '—'}
            </span>
          </InvestmentRow>
        )}

        {notable.length > 0 && (
          <InvestmentRow icon={Link2} label="Shackle ที่คุ้มค่า">
            <span className="flex flex-wrap gap-1">
              {notable.map(({ stage, data }) => (
                <span
                  key={stage}
                  title={data?.bonus_th || data?.bonus || undefined}
                  className="rounded bg-ptn-bg px-1.5 py-0.5 text-xs"
                >
                  S{stage}{data?.name ? ` · ${data.name}` : ''}
                </span>
              ))}
            </span>
          </InvestmentRow>
        )}

        {ecbName && (
          <InvestmentRow icon={Gem} label="Crimebrand ที่แนะนำ">
            {ecbName}
          </InvestmentRow>
        )}

        {team.length > 0 && (
          <InvestmentRow icon={Users} label="ทีมที่เข้าขา">
            <span className="flex flex-wrap items-center gap-2 pt-0.5">
              {team.map(c => (
                <Link
                  key={c.id}
                  to={`/characters/${c.slug}`}
                  className="group flex items-center gap-1.5 rounded bg-ptn-bg px-1.5 py-1 transition-colors hover:bg-ptn-border"
                >
                  {c.portrait_url
                    ? <img src={c.portrait_url} alt="" className="h-6 w-6 rounded object-cover object-top" />
                    : <span className="flex h-6 w-6 items-center justify-center rounded bg-ptn-elevated text-[10px] text-ptn-disabled">{c.name[0]}</span>}
                  <span className="text-xs group-hover:text-ptn-cyan">{c.name}</span>
                </Link>
              ))}
            </span>
          </InvestmentRow>
        )}
      </div>
    </div>
  )
}

function GuideSectionBlock({ heading, body }: { heading: string; body: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="overflow-hidden rounded-lg border border-ptn-border">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 bg-ptn-elevated px-4 py-2.5 text-left transition-colors hover:bg-ptn-border/60"
      >
        <ChevronDown size={15} className={cn('text-ptn-muted transition-transform', !open && '-rotate-90')} />
        <span className="font-heading font-bold text-ptn-text">{heading}</span>
      </button>
      {open && (
        <div className="prose-ptn bg-ptn-surface px-4 py-3 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export function GuideView({
  guide, skills, shackles, ecbName, team,
  voted, voting, onVote, canEdit, onEdit, onDelete,
}: {
  guide: GuideWithAuthor
  skills: CharacterSkill[]
  shackles: ShackleBreak[]
  ecbName: string | null
  team: TeamMate[]
  voted: boolean
  voting: boolean
  onVote: () => void
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const author = guide.author
  const ageDays = daysSince(guide.updated_at)
  const stale = ageDays > STALE_AFTER_DAYS

  return (
    <Card className="overflow-hidden">
      {/* หัวไกด์ — ใคร เมื่อไหร่ แพตช์ไหน */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ptn-border bg-ptn-elevated/40 px-4 py-3">
        <button
          onClick={onVote}
          disabled={voting}
          title={voted ? 'ยกเลิกโหวต' : 'ไกด์นี้มีประโยชน์'}
          className={cn(
            'flex shrink-0 flex-col items-center rounded-lg border px-2.5 py-1 transition-colors disabled:opacity-50',
            voted
              ? 'border-ptn-red/40 bg-ptn-red/15 text-ptn-red'
              : 'border-ptn-border text-ptn-muted hover:border-ptn-red/40 hover:text-ptn-red',
          )}
        >
          <ThumbsUp size={14} className={voted ? 'fill-current' : ''} />
          <span className="text-xs font-bold">{guide.upvotes}</span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-bold leading-tight text-ptn-text">{guide.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ptn-muted">
            {author && (
              <Link to={`/profile/${author.username}`} className="flex items-center gap-1.5 hover:text-ptn-text">
                <Avatar src={author.avatar_url} username={author.username} size="sm" />
                {author.display_name || author.username}
              </Link>
            )}
            <span>·</span>
            <span>อัปเดต {formatRelativeTime(guide.updated_at)}</span>
            {guide.patch_version && (
              <>
                <span>·</span>
                <span className="rounded bg-ptn-bg px-1.5 py-0.5">แพตช์ {guide.patch_version}</span>
              </>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={onEdit} title="แก้ไขไกด์" className="p-1.5 text-ptn-muted transition-colors hover:text-ptn-cyan">
              <Pencil size={15} />
            </button>
            <button onClick={onDelete} title="ลบไกด์" className="p-1.5 text-ptn-muted transition-colors hover:text-ptn-red">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {stale && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-400">
          <AlertTriangle size={13} className="shrink-0" />
          ไกด์นี้ไม่ได้อัปเดตมานานกว่า {Math.floor(ageDays / 30)} เดือน — เกมอาจปรับสมดุลไปแล้ว
        </div>
      )}

      <div className="space-y-3 p-4">
        {guide.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {guide.tags.map(t => (
              <span key={t} className="rounded-full border border-ptn-cyan/30 bg-ptn-cyan/10 px-2 py-0.5 text-xs text-ptn-cyan">
                {t}
              </span>
            ))}
          </div>
        )}

        <InvestmentBox guide={guide} skills={skills} shackles={shackles} ecbName={ecbName} team={team} />

        {guide.sections.map((s, i) => (
          <GuideSectionBlock key={i} heading={s.heading || `หัวข้อ ${i + 1}`} body={s.body} />
        ))}
      </div>
    </Card>
  )
}

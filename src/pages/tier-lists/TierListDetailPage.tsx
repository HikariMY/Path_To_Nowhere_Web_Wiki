import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ThumbsUp, Crown, Edit2, Trash2, Clock, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TierListWithAuthor, Character, TierRow, TierListMeta } from '../../types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { cn, formatRelativeTime } from '../../lib/utils'
import { TierCharCard, TierLabel, TierLegend, TierMarkBadge, TierServerBadges } from '../../components/tier-lists/TierParts'
import { ReportButton } from '../../components/moderation/ReportButton'
import { charsInColumn, findPlacement, readTierListMeta, safeHttpUrl } from '../../lib/tierList'
import { tierMark } from '../../lib/tierMarks'

// เทียร์ลิสต์ทางการของอีกเซิร์ฟ — ใช้บอกว่าตัวเดียวกันอยู่ระดับไหน (Global ↔ CN)
type OtherList = { id: string; server: TierListMeta['server']; tiers: TierRow[] }

export function TierListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [tierList, setTierList] = useState<TierListWithAuthor | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [other, setOther] = useState<OtherList | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      const { data: tlData } = await supabase
        .from('tier_lists')
        .select('*, author:profiles(id, username, avatar_url, role)')
        .eq('id', id)
        .single()

      if (tlData) {
        setTierList(tlData as TierListWithAuthor)
        // Fetch characters used in tier list
        const tiers = (tlData as unknown as TierListWithAuthor).tiers as TierRow[]
        const allIds = tiers.flatMap(t => t.character_ids)
        if (allIds.length > 0) {
          const { data: chars } = await supabase
            .from('characters')
            .select('*')
            .in('id', allIds)
          setCharacters(chars || [])
        }
        // เทียร์ลิสต์ทางการ: หาอันทางการปัจจุบันของอีกเซิร์ฟ — ยิงเฉพาะเมื่อรัน migration แล้ว (แถวมีคอลัมน์ server)
        const meta = readTierListMeta(tlData as Record<string, unknown>)
        if ((tlData as TierListWithAuthor).is_official && 'server' in tlData) {
          const { data: others, error } = await supabase
            .from('tier_lists')
            .select('id, server, tiers')
            .eq('is_official', true)
            .eq('is_public', true)
            .eq('is_archived', false)
            .eq('server', meta.server === 'cn' ? 'global' : 'cn')
            .order('updated_at', { ascending: false })
            .limit(1)
          const o = !error && others?.[0]
          if (o) setOther({ id: o.id, server: readTierListMeta(o as Record<string, unknown>).server, tiers: o.tiers as TierRow[] })
        }
        // Check if user voted
        if (user) {
          const { data: vote } = await supabase
            .from('tier_list_votes')
            .select('id')
            .eq('tier_list_id', id)
            .eq('user_id', user.id)
            .single()
          setHasVoted(!!vote)
        }
      }
      setLoading(false)
    }
    fetchAll()
  }, [id, user])

  const handleVote = async () => {
    if (!user) { toast('กรุณาเข้าสู่ระบบก่อน', 'error'); return }
    setVoting(true)
    if (hasVoted) {
      await supabase.from('tier_list_votes').delete().eq('tier_list_id', id).eq('user_id', user.id)
      setHasVoted(false)
      setTierList(prev => prev ? { ...prev, upvotes: prev.upvotes - 1 } : prev)
    } else {
      await supabase.from('tier_list_votes').insert({ tier_list_id: id as string, user_id: user.id } as never)
      setHasVoted(true)
      setTierList(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : prev)
    }
    setVoting(false)
  }

  const handleDelete = async () => {
    if (!confirm('ยืนยันการลบเทียร์ลิสต์นี้?')) return
    await supabase.from('tier_lists').delete().eq('id', id)
    toast('ลบเทียร์ลิสต์สำเร็จ', 'success')
    navigate('/tier-lists')
  }

  if (loading) return <PageLoader />
  if (!tierList) return (
    <div className="text-center py-20 text-ptn-muted">
      ไม่พบเทียร์ลิสต์นี้ <Link to="/tier-lists" className="text-ptn-cyan hover:underline ml-2">กลับ</Link>
    </div>
  )

  const tiers = (tierList.tiers as unknown) as TierRow[]
  const meta = readTierListMeta(tierList as unknown as Record<string, unknown>)
  const cols = meta.roleColumns
  const charMap = Object.fromEntries(characters.map(c => [c.id, c]))
  const canEdit = user && (profile?.id === tierList.author_id || isAdmin)
  const sourceUrl = safeHttpUrl(meta.source?.url)
  const originalUrl = safeHttpUrl(meta.source?.original_url)

  const charButton = (tier: TierRow, cid: string) => {
    const char = charMap[cid]
    if (!char) return (
      <div key={cid} className="w-14 h-[68px] sm:w-16 sm:h-20 rounded bg-ptn-elevated border border-ptn-border flex items-center justify-center text-xs text-ptn-disabled">?</div>
    )
    const detail = tier.details?.[cid]
    return (
      <button
        key={cid}
        type="button"
        onClick={() => setSelected(prev => (prev === cid ? null : cid))}
        aria-pressed={selected === cid}
        className="rounded hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan"
      >
        <TierCharCard char={char} selected={selected === cid} marks={detail?.marks} hasNote={!!detail?.note} />
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/tier-lists" className="flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text mb-6 w-fit">
        <ChevronLeft size={16} /> กลับไปเทียร์ลิสต์
      </Link>

      {/* Header */}
      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {tierList.is_official && (
                <span className="flex items-center gap-1 text-xs text-ptn-gold bg-ptn-gold/10 border border-ptn-gold/20 px-2 py-0.5 rounded">
                  <Crown size={10} /> ทางการ
                </span>
              )}
              <TierServerBadges server={meta.server} archived={meta.isArchived} official={tierList.is_official} />
              {tierList.patch_version && (
                <span className="text-xs text-ptn-muted bg-ptn-elevated border border-ptn-border px-2 py-0.5 rounded">
                  v{tierList.patch_version}
                </span>
              )}
            </div>
            <h1 className="font-heading text-2xl font-bold text-ptn-text mb-1">{tierList.title}</h1>
            {tierList.description && (
              <p className="text-sm text-ptn-muted mb-3">{tierList.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-ptn-muted">
              <div className="flex items-center gap-1.5">
                <Avatar src={tierList.author.avatar_url} username={tierList.author.username} size="sm" />
                <Link to={`/profile/${tierList.author.username}`} className="hover:text-ptn-text transition-colors">
                  {tierList.author.username}
                </Link>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} />
                {formatRelativeTime(tierList.updated_at)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              variant={hasVoted ? 'primary' : 'outline'}
              size="sm"
              onClick={handleVote}
              loading={voting}
            >
              <ThumbsUp size={14} />
              {tierList.upvotes}
            </Button>
            {canEdit && (
              <div className="flex gap-1">
                <Link to={`/tier-lists/${id}/edit`}>
                  <Button variant="ghost" size="sm"><Edit2 size={13} /></Button>
                </Link>
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  <Trash2 size={13} />
                </Button>
              </div>
            )}
            <ReportButton targetType="tier_list" targetId={tierList.id} authorId={tierList.author_id} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        {/* Tier Rows */}
        <div className="space-y-2">
          {cols.length > 1 && (
            <div className="hidden sm:flex sm:pl-24">
              {cols.map(c => (
                <span key={c} className="flex-1 px-3 font-mono text-[11px] font-bold uppercase tracking-wider text-ptn-disabled">{c}</span>
              ))}
            </div>
          )}
          {tiers.map((tier, i) => (
            <div key={i} className="flex items-stretch rounded-lg border border-ptn-border overflow-hidden">
              {/* Label */}
              <TierLabel label={tier.label} color={tier.color} />
              {/* Characters */}
              <div className="flex-1 min-w-0 bg-ptn-surface">
                {tier.note && <p className="px-3 pt-2 text-xs text-ptn-muted">{tier.note}</p>}
                <div className={cols.length > 1 ? 'grid sm:grid-flow-col sm:auto-cols-fr' : undefined}>
                  {(cols.length > 1 ? cols : ['']).map((col, ci) => {
                    const ids = charsInColumn(tier, ci, cols.length)
                    return (
                      <div key={ci} className={cn('p-3', ci > 0 && 'border-t border-dashed border-ptn-border/60 sm:border-l sm:border-t-0')}>
                        {col && <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ptn-disabled sm:hidden">{col}</p>}
                        <div className="flex flex-wrap gap-2 min-h-[80px]">
                          {ids.length === 0 && (
                            <span className="text-xs text-ptn-disabled self-center">{tier.character_ids.length === 0 ? 'ว่าง' : '—'}</span>
                          )}
                          {ids.map(cid => charButton(tier, cid))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {tiers.length === 0 && (
            <Card className="p-8 text-center text-ptn-muted">
              <p>เทียร์ลิสต์นี้ยังไม่มีข้อมูล</p>
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <CharacterInfo
            charId={selected}
            char={selected ? charMap[selected] : undefined}
            tiers={tiers}
            cols={cols}
            other={other}
          />
          {meta.legend.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ptn-muted">ความหมายเครื่องหมาย</h2>
              <TierLegend keys={meta.legend} />
            </Card>
          )}
          {meta.source && sourceUrl && (
            <Card className="p-4 border-l-2 border-l-ptn-red">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ptn-muted">ต้นฉบับ</h2>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-ptn-text hover:text-ptn-cyan">
                <ExternalLink size={14} className="mt-0.5 shrink-0" />
                <span><b>{meta.source.title}</b><br /><span className="text-xs text-ptn-muted">โดย {meta.source.author}{meta.source.date ? ` · ${meta.source.date}` : ''}</span></span>
              </a>
              {originalUrl && (
                <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 text-xs text-ptn-muted hover:text-ptn-cyan">
                  <ExternalLink size={12} /> โพสต์ต้นฉบับ
                </a>
              )}
              <p className="mt-3 text-xs text-ptn-disabled">ทีมงานจัดตำแหน่งและเขียนหมายเหตุเองจากต้นฉบับ ไม่ได้นำภาพต้นฉบับมาแสดงซ้ำ</p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

/** รายละเอียดตัวที่กดเลือก: เครื่องหมาย · หมายเหตุ · ระดับในอีกเซิร์ฟ · ลิงก์หน้าตัวละคร */
function CharacterInfo({ charId, char, tiers, cols, other }: {
  charId: string | null
  char: Character | undefined
  tiers: TierRow[]
  cols: string[]
  other: OtherList | null
}) {
  const at = charId ? findPlacement(tiers, charId) : null
  if (!charId || !char || !at) {
    return (
      <Card className="p-4 text-sm text-ptn-muted">
        กดที่รูปตัวละครเพื่อดูเหตุผลและเงื่อนไข · จุดสีทองมุมขวาล่าง = มีหมายเหตุ
      </Card>
    )
  }
  const tier = tiers[at.tierIndex]
  const marks = at.detail.marks ?? []
  const elsewhere = other ? findPlacement(other.tiers, charId) : null
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        {char.portrait_url && <img src={char.portrait_url} alt="" className="h-14 w-14 rounded border border-ptn-border object-cover" />}
        <div className="min-w-0">
          <p className="font-heading font-bold text-ptn-text">{char.name}</p>
          <p className="text-xs text-ptn-muted">
            {[`${char.rarity}-Rank`, `Tier ${tier.label}`, cols.length > 1 ? cols[Math.min(at.detail.col ?? 0, cols.length - 1)] : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      {marks.length > 0 && (
        <ul className="space-y-1.5">
          {marks.map(m => (
            <li key={m} className="flex items-start gap-2 text-sm">
              <TierMarkBadge mark={m} className="mt-0.5" />
              <span><b className="text-ptn-text">{tierMark(m)?.label}</b> <span className="text-ptn-muted">— {tierMark(m)?.th}</span></span>
            </li>
          ))}
        </ul>
      )}
      {at.detail.note
        ? <p className="text-sm text-ptn-text whitespace-pre-line">{at.detail.note}</p>
        : <p className="text-xs text-ptn-disabled">ยังไม่มีหมายเหตุสำหรับตัวนี้</p>}
      {other && elsewhere && (
        <p className="text-sm text-ptn-muted">
          {other.server === 'cn' ? 'ในเซิร์ฟจีนอยู่ ' : 'ใน Global อยู่ '}
          <b className="text-ptn-text">Tier {other.tiers[elsewhere.tierIndex].label}</b>
          {' · '}
          <Link to={`/tier-lists/${other.id}`} className="text-ptn-cyan hover:underline">ดูเทียร์ลิสต์</Link>
        </p>
      )}
      <Link to={`/characters/${char.slug}`}>
        <Button variant="outline" size="sm">ดูหน้าตัวละคร</Button>
      </Link>
    </Card>
  )
}

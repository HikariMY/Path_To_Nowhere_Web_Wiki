import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ThumbsUp, Crown, Edit2, Trash2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TierListWithAuthor, Character, TierRow } from '../../types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { formatRelativeTime } from '../../lib/utils'
import { RARITY_COLORS } from '../../lib/constants'

export function TierListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [tierList, setTierList] = useState<TierListWithAuthor | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
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
  const charMap = Object.fromEntries(characters.map(c => [c.id, c]))
  const canEdit = user && (profile?.id === tierList.author_id || isAdmin)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
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
          </div>
        </div>
      </Card>

      {/* Tier Rows */}
      <div className="space-y-2">
        {tiers.map((tier, i) => (
          <div key={i} className="flex items-stretch rounded-lg border border-ptn-border overflow-hidden">
            {/* Label */}
            <div
              className="flex w-12 sm:w-16 items-center justify-center shrink-0 font-heading font-bold text-xl"
              style={{ background: `${tier.color}20`, color: tier.color, borderRight: `2px solid ${tier.color}40` }}
            >
              {tier.label}
            </div>
            {/* Characters */}
            <div className="flex flex-wrap gap-2 p-3 flex-1 bg-ptn-surface min-h-[72px]">
              {tier.character_ids.length === 0 && (
                <span className="text-xs text-ptn-disabled self-center">ว่าง</span>
              )}
              {tier.character_ids.map(cid => {
                const char = charMap[cid]
                if (!char) return (
                  <div key={cid} className="w-14 h-16 rounded bg-ptn-elevated border border-ptn-border flex items-center justify-center text-xs text-ptn-disabled">?</div>
                )
                return (
                  <Link key={cid} to={`/characters/${char.slug}`}>
                    <div className="group flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-14 rounded overflow-hidden border flex items-center justify-center bg-ptn-elevated relative"
                        style={{ borderColor: `${RARITY_COLORS[char.rarity]}60` }}
                      >
                        {char.portrait_url ? (
                          <img src={char.portrait_url} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-heading font-bold text-lg" style={{ color: RARITY_COLORS[char.rarity] }}>
                            {char.name[0]}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-ptn-muted group-hover:text-ptn-text transition-colors max-w-[50px] truncate">
                        {char.name}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <Card className="p-8 text-center text-ptn-muted">
          <p>เทียร์ลิสต์นี้ยังไม่มีข้อมูล</p>
        </Card>
      )}
    </div>
  )
}

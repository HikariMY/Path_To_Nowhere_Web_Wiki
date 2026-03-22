import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ThumbsUp, Crown, Plus, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TierListWithAuthor } from '../../types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Tabs } from '../../components/ui/Tabs'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { formatRelativeTime } from '../../lib/utils'

const DEMO_TIERS: TierListWithAuthor[] = [
  {
    id: '1', author_id: 'a1', title: 'เทียร์ลิสต์อย่างเป็นทางการ v3.0', description: 'จัดอันดับตัวละครสำหรับเนื้อหาทั้งหมดในเกม', is_official: true, is_public: true, patch_version: '3.0', tiers: [
      { label: 'S', color: '#FFD700', character_ids: [] },
      { label: 'A', color: '#C084FC', character_ids: [] },
    ], upvotes: 142, created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString(),
    author: { id: 'a1', username: 'AdminPTN', avatar_url: null, role: 'admin' as const },
  },
  {
    id: '2', author_id: 'u1', title: 'เทียร์ลิสต์สำหรับ PvE ด่านยาก', description: 'จัดอันดับเฉพาะด่านยากระดับ Crimson Abyss', is_official: false, is_public: true, patch_version: '2.9', tiers: [
      { label: 'S', color: '#FFD700', character_ids: [] as string[] },
      { label: 'A', color: '#C084FC', character_ids: [] as string[] },
    ], upvotes: 38, created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString(),
    author: { id: 'u1', username: 'Sinnercraft', avatar_url: null, role: 'user' as const },
  },
]

export function TierListsPage() {
  const { user } = useAuth()
  const [officialLists, setOfficialLists] = useState<TierListWithAuthor[]>([])
  const [communityLists, setCommunityLists] = useState<TierListWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLists = async () => {
      const { data } = await supabase
        .from('tier_lists')
        .select('*, author:profiles(id, username, avatar_url, role)')
        .eq('is_public', true)
        .order('upvotes', { ascending: false })

      if (data && data.length > 0) {
        setOfficialLists(data.filter((t: TierListWithAuthor) => t.is_official) as TierListWithAuthor[])
        setCommunityLists(data.filter((t: TierListWithAuthor) => !t.is_official) as TierListWithAuthor[])
      } else {
        setOfficialLists(DEMO_TIERS.filter(t => t.is_official))
        setCommunityLists(DEMO_TIERS.filter(t => !t.is_official))
      }
      setLoading(false)
    }
    fetchLists()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ptn-text flex items-center gap-3">
            <BarChart3 size={28} className="text-ptn-gold" />
            เทียร์ลิสต์
          </h1>
          <p className="text-ptn-muted mt-1">จัดอันดับตัวละครโดยแอดมินและชุมชน</p>
        </div>
        {user && (
          <Link to="/tier-lists/create">
            <Button variant="cyan" size="sm">
              <Plus size={14} /> สร้างเทียร์ลิสต์
            </Button>
          </Link>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'official', label: 'อย่างเป็นทางการ', icon: <Crown size={14} className="text-ptn-gold" /> },
          { id: 'community', label: 'ชุมชน', icon: <ThumbsUp size={14} /> },
        ]}
        defaultTab="official"
      >
        {(activeTab) => (
          <div className="space-y-4">
            {activeTab === 'official' && (
              <>
                {officialLists.length === 0 && (
                  <Card className="p-8 text-center text-ptn-muted">
                    <Crown size={40} className="mx-auto mb-3 opacity-30" />
                    <p>ยังไม่มีเทียร์ลิสต์อย่างเป็นทางการ</p>
                  </Card>
                )}
                {officialLists.map(tier => <TierListCard key={tier.id} tierList={tier} />)}
              </>
            )}
            {activeTab === 'community' && (
              <>
                {communityLists.length === 0 && (
                  <Card className="p-8 text-center text-ptn-muted">
                    <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                    <p>ยังไม่มีเทียร์ลิสต์จากชุมชน</p>
                    {user && (
                      <Link to="/tier-lists/create">
                        <Button variant="cyan" size="sm" className="mt-3">
                          <Plus size={14} /> สร้างเทียร์ลิสต์แรก
                        </Button>
                      </Link>
                    )}
                  </Card>
                )}
                {communityLists.map(tier => <TierListCard key={tier.id} tierList={tier} />)}
              </>
            )}
          </div>
        )}
      </Tabs>
    </div>
  )
}

function TierListCard({ tierList }: { tierList: TierListWithAuthor }) {
  const tiers = (tierList.tiers as Array<{ label: string; color: string; character_ids: string[] }>) || []

  return (
    <Link to={`/tier-lists/${tierList.id}`}>
      <Card hover className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            <h3 className="font-heading text-lg font-semibold text-ptn-text group-hover:text-ptn-red">
              {tierList.title}
            </h3>
            {tierList.description && (
              <p className="text-sm text-ptn-muted mt-1 line-clamp-2">{tierList.description}</p>
            )}

            {/* Tier preview */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {tiers.slice(0, 6).map((tier, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border"
                  style={{
                    borderColor: `${tier.color}40`,
                    background: `${tier.color}15`,
                    color: tier.color,
                  }}
                >
                  {tier.label}
                  {tier.character_ids.length > 0 && (
                    <span className="opacity-60">({tier.character_ids.length})</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-ptn-muted">
              <div className="flex items-center gap-1">
                <Avatar src={tierList.author.avatar_url} username={tierList.author.username} size="sm" />
                <span>{tierList.author.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} />
                {formatRelativeTime(tierList.updated_at)}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1">
            <ThumbsUp size={16} className="text-ptn-muted" />
            <span className="font-heading font-bold text-ptn-text">{tierList.upvotes}</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

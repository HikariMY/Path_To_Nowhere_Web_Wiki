import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MessageSquare, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile, ForumPostWithAuthor } from '../../types'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { formatDate, formatRelativeTime } from '../../lib/utils'

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<ForumPostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()
      if (profileData) {
        setProfile(profileData)
        const { data: postsData } = await supabase
          .from('forum_posts')
          .select('*, author:profiles(id, username, avatar_url, role), category:forum_categories(id, name, slug, color)')
          .eq('author_id', profileData.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10)
        setPosts((postsData || []) as ForumPostWithAuthor[])
      }
      setLoading(false)
    }
    fetch()
  }, [username])

  if (loading) return <PageLoader />
  if (!profile) return (
    <div className="text-center py-20 text-ptn-muted">ไม่พบโปรไฟล์นี้</div>
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Profile header */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-5">
          <Avatar src={profile.avatar_url} username={profile.username} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="font-heading text-2xl font-bold text-ptn-text">{profile.display_name || profile.username}</h1>
              <Badge variant="role" value={profile.role} />
            </div>
            {profile.bio && <p className="text-ptn-muted text-sm mb-3">{profile.bio}</p>}
            <div className="flex items-center gap-4 text-xs text-ptn-muted">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                สมัครเมื่อ {formatDate(profile.created_at, { year: 'numeric', month: 'long' })}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {profile.post_count} กระทู้
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent posts */}
      <h2 className="font-heading text-lg font-semibold text-ptn-text mb-3">กระทู้ล่าสุด</h2>
      {posts.length === 0 ? (
        <Card className="p-6 text-center text-ptn-muted">ยังไม่มีกระทู้</Card>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <Link key={post.id} to={`/forum/${(post.category as { slug: string })?.slug}/${post.id}`}>
              <Card hover className="p-4">
                <h3 className="font-medium text-ptn-text text-sm mb-1 line-clamp-1">{post.title}</h3>
                <div className="flex items-center gap-2 text-xs text-ptn-muted">
                  {post.category && (
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        background: `${(post.category as { color: string })?.color}15`,
                        color: (post.category as { color: string })?.color,
                      }}
                    >
                      {(post.category as { name: string })?.name}
                    </span>
                  )}
                  <span>{formatRelativeTime(post.created_at)}</span>
                  <span>· {post.reply_count} ตอบกลับ</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

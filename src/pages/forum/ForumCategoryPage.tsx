import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MessageSquare, Pin, Lock, Eye, ChevronLeft, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ForumCategory, ForumPostWithAuthor } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { formatRelativeTime, cn } from '../../lib/utils'
import { PAGE_SIZE } from '../../lib/constants'

export function ForumCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const { user } = useAuth()
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [posts, setPosts] = useState<ForumPostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const fetchCategory = async () => {
      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single()
      if (!data) {
        // Use demo
        setCategory({ id: '1', name: 'ทั่วไป', slug: categorySlug!, description: 'พูดคุยทั่วไป', icon: 'MessageSquare', color: '#60A5FA', sort_order: 1, post_count: 5, is_locked: false, created_at: '' })
      } else {
        setCategory(data)
      }
    }
    fetchCategory()
  }, [categorySlug])

  useEffect(() => {
    if (!category) return
    const fetchPosts = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('forum_posts')
        .select('*, author:profiles(id, username, avatar_url, role)')
        .eq('category_id', category.id)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      const newPosts = (data || []) as ForumPostWithAuthor[]
      setPosts(prev => page === 0 ? newPosts : [...prev, ...newPosts])
      setHasMore(newPosts.length === PAGE_SIZE)
      setLoading(false)
    }
    fetchPosts()
  }, [category, page])

  if (!category && loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/forum" className="flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text mb-6 w-fit">
        <ChevronLeft size={16} /> กลับไปฟอรัม
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ptn-text">{category?.name}</h1>
          {category?.description && (
            <p className="text-sm text-ptn-muted mt-1">{category.description}</p>
          )}
        </div>
        {user && !category?.is_locked && (
          <Link to={`/forum/${categorySlug}/new`}>
            <Button size="sm">
              <Plus size={14} /> ตั้งกระทู้ใหม่
            </Button>
          </Link>
        )}
      </div>

      {loading && page === 0 && <PageLoader />}

      {!loading && posts.length === 0 && (
        <Card className="p-8 text-center text-ptn-muted">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีกระทู้ในหมวดหมู่นี้</p>
          {user && (
            <Link to={`/forum/${categorySlug}/new`}>
              <Button size="sm" className="mt-3"><Plus size={14} /> ตั้งกระทู้แรก</Button>
            </Link>
          )}
        </Card>
      )}

      <div className="space-y-2">
        {posts.map(post => (
          <Link key={post.id} to={`/forum/${categorySlug}/${post.id}`}>
            <Card hover className="p-4">
              <div className="flex items-start gap-3">
                <Avatar src={post.author.avatar_url} username={post.author.username} size="md" className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.is_pinned && <Pin size={12} className="text-ptn-gold" />}
                    {post.is_locked && <Lock size={12} className="text-ptn-muted" />}
                    <h3 className={cn(
                      'font-medium text-ptn-text line-clamp-1',
                      post.is_pinned && 'text-ptn-gold',
                    )}>
                      {post.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ptn-muted flex-wrap">
                    <span>{post.author.username}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(post.created_at)}</span>
                    {post.reply_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <MessageSquare size={11} /> {post.reply_count} ตอบกลับ
                        </span>
                      </>
                    )}
                    {post.views > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Eye size={11} /> {post.views}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => setPage(p => p + 1)} loading={loading}>
            โหลดเพิ่มเติม
          </Button>
        </div>
      )}
    </div>
  )
}

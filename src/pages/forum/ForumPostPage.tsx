import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, MessageSquare, Send, Trash2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ForumPostWithAuthor, ForumReplyWithAuthor } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { MultiImageUpload } from '../../components/ui/MultiImageUpload'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { formatRelativeTime, formatDate } from '../../lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ForumPostPage() {
  const { categorySlug, postId } = useParams<{ categorySlug: string; postId: string }>()
  const { user, profile, isModerator } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [post, setPost] = useState<ForumPostWithAuthor | null>(null)
  const [replies, setReplies] = useState<ForumReplyWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      // Fetch post without join first
      const { data: postData } = await supabase
        .from('forum_posts')
        .select('*, category:forum_categories(id, name, slug, color)')
        .eq('id', postId)
        .single()

      if (postData) {
        // Fetch author separately to avoid join RLS issues
        const { data: authorData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, role')
          .eq('id', postData.author_id)
          .single()

        setPost({ ...postData, author: authorData || { id: postData.author_id, username: 'ไม่ทราบ', avatar_url: null, role: 'user' } } as ForumPostWithAuthor)
        supabase.rpc('increment_post_views', { post_id: postId! }).then(() => {})

        // Fetch replies
        const { data: repliesData } = await supabase
          .from('forum_replies')
          .select('*')
          .eq('post_id', postId)
          .order('created_at')

        if (repliesData?.length) {
          const authorIds = [...new Set(repliesData.map(r => r.author_id))]
          const { data: authorsData } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, role')
            .in('id', authorIds)
          const authorsMap = Object.fromEntries((authorsData || []).map(a => [a.id, a]))
          setReplies(repliesData.map(r => ({
            ...r,
            author: authorsMap[r.author_id] || { id: r.author_id, username: 'ไม่ทราบ', avatar_url: null, role: 'user' }
          })) as ForumReplyWithAuthor[])
        }
      }
      setLoading(false)
    }
    fetchPost()
  }, [postId])

  const handleReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    if (!user) { toast('กรุณาเข้าสู่ระบบก่อน', 'error'); return }

    setSubmitting(true)
    const { data: newReply, error } = await supabase
      .from('forum_replies')
      .insert({ post_id: postId!, author_id: user.id, content: replyContent.trim(), image_urls: replyImages })
      .select('*, author:profiles(id, username, avatar_url, role)')
      .single()

    if (!error && newReply) {
      setReplies(prev => [...prev, newReply as ForumReplyWithAuthor])
      setReplyContent('')
      setReplyImages([])
      // Update reply count
      await supabase
        .from('forum_posts')
        .update({ reply_count: (post?.reply_count || 0) + 1, last_reply_at: new Date().toISOString(), last_reply_by: user.id })
        .eq('id', postId)
      setPost(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev)
      toast('ตอบกลับสำเร็จ', 'success')
    } else {
      toast('เกิดข้อผิดพลาด', 'error')
    }
    setSubmitting(false)
  }

  const handleDeletePost = async () => {
    if (!confirm('ยืนยันการลบกระทู้นี้?')) return
    const { error } = await supabase.from('forum_posts').delete().eq('id', postId)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    toast('ลบกระทู้สำเร็จ', 'success')
    navigate(`/forum/${categorySlug}`)
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('ยืนยันการลบการตอบกลับนี้?')) return
    const { error } = await supabase.from('forum_replies').delete().eq('id', replyId)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    setReplies(prev => prev.filter(r => r.id !== replyId))
    toast('ลบการตอบกลับสำเร็จ', 'success')
  }

  if (loading) return <PageLoader />
  if (!post) return (
    <div className="text-center py-20 text-ptn-muted">
      ไม่พบกระทู้นี้ <Link to={`/forum/${categorySlug}`} className="text-ptn-cyan hover:underline ml-2">กลับ</Link>
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to={`/forum/${categorySlug}`} className="flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text mb-6 w-fit">
        <ChevronLeft size={16} /> กลับไปหมวดหมู่
      </Link>

      {/* Post */}
      <Card className="p-5 mb-4">
        <h1 className="font-heading text-xl font-bold text-ptn-text mb-4">{post.title}</h1>
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-ptn-border">
          <Link to={`/profile/${post.author.username}`}>
            <Avatar src={post.author.avatar_url} username={post.author.username} size="md" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link to={`/profile/${post.author.username}`} className="font-medium text-ptn-text text-sm hover:text-ptn-cyan">
                {post.author.display_name || post.author.username}
              </Link>
              <Badge variant="role" value={post.author.role} />
            </div>
            <div className="flex items-center gap-2 text-xs text-ptn-muted mt-0.5">
              <span>{formatDate(post.created_at)}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Eye size={11} />{post.views} ครั้ง</span>
            </div>
          </div>
          {(user?.id === post.author_id || isModerator) && (
            <button
              onClick={handleDeletePost}
              className="shrink-0 text-ptn-muted hover:text-red-400 transition-colors p-1"
              title="ลบกระทู้"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
        <div className="prose-ptn">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </div>
        {post.image_urls?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ptn-border">
            {post.image_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-ptn-border hover:border-ptn-red/50 transition-colors">
                <img src={url} alt={`ภาพ ${i + 1}`} className="max-h-64 max-w-xs object-contain bg-black/30" />
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mb-6">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-ptn-text mb-3">
            <MessageSquare size={16} className="text-ptn-muted" />
            การตอบกลับ {replies.length} รายการ
          </h2>
          <div className="space-y-3">
            {replies.map((reply, i) => (
              <Card key={reply.id} className="p-4">
                <div className="flex gap-3">
                  <div className="shrink-0">
                    <Link to={`/profile/${reply.author.username}`}>
                      <Avatar src={reply.author.avatar_url} username={reply.author.username} size="md" />
                    </Link>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Link to={`/profile/${reply.author.username}`} className="font-medium text-sm text-ptn-text hover:text-ptn-cyan">
                          {reply.author.display_name || reply.author.username}
                        </Link>
                        <Badge variant="role" value={reply.author.role} />
                        <span className="text-xs text-ptn-disabled">#{i + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ptn-muted">{formatRelativeTime(reply.created_at)}</span>
                        {(user?.id === reply.author_id || isModerator) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="text-ptn-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="prose-ptn text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reply.content}
                      </ReactMarkdown>
                    </div>
                    {reply.image_urls?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ptn-border">
                        {reply.image_urls.map((url, j) => (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-ptn-border hover:border-ptn-red/50 transition-colors">
                            <img src={url} alt={`ภาพ ${j + 1}`} className="max-h-48 max-w-xs object-contain bg-black/30" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reply form */}
      {!post.is_locked ? (
        user ? (
          <Card className="p-4">
            <h3 className="font-heading font-semibold text-ptn-text mb-3 flex items-center gap-2">
              <Send size={14} /> ตอบกลับกระทู้
            </h3>
            <form onSubmit={handleReply} className="space-y-3">
              <Textarea
                placeholder="เขียนคำตอบของคุณ... (รองรับ Markdown)"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                rows={5}
              />
              <MultiImageUpload urls={replyImages} onChange={setReplyImages} maxImages={4} />
              <Button type="submit" loading={submitting} disabled={!replyContent.trim()}>
                <Send size={14} /> ส่งการตอบกลับ
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-4 text-center">
            <p className="text-ptn-muted text-sm">
              <Link to="/login" className="text-ptn-cyan hover:underline">เข้าสู่ระบบ</Link>
              {' '}เพื่อตอบกลับกระทู้นี้
            </p>
          </Card>
        )
      ) : (
        <Card className="p-4 text-center text-ptn-muted text-sm">
          กระทู้นี้ถูกล็อคแล้ว ไม่สามารถตอบกลับได้
        </Card>
      )}
    </div>
  )
}

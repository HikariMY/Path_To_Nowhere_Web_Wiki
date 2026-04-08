// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, Search, Pin, Eye, Lock, Unlock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { formatRelativeTime } from '../../lib/utils'

export function AdminForumPostsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [postsRes, catsRes] = await Promise.all([
      supabase
        .from('forum_posts')
        .select('id, title, created_at, reply_count, is_pinned, is_locked, category_id, forum_categories(name, slug), profiles(username, display_name)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('forum_categories').select('id, name').order('sort_order'),
    ])
    setPosts(postsRes.data || [])
    setCategories(catsRes.data || [])
    setLoading(false)
  }

  const handleDelete = async (post) => {
    if (!confirm(`ยืนยันการลบโพสต์ "${post.title}"?`)) return
    const { error } = await supabase.from('forum_posts').update({ is_deleted: true }).eq('id', post.id)
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== post.id))
      toast('ลบโพสต์สำเร็จ', 'success')
      await supabase.from('admin_logs').insert({
        admin_id: profile.id,
        action: `ลบโพสต์ฟอรัม: ${post.title}`,
        target_table: 'forum_posts',
        target_id: post.id,
      })
    } else {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    }
  }

  const togglePin = async (post) => {
    const { error } = await supabase.from('forum_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id)
    if (!error) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: !p.is_pinned } : p))
      toast(post.is_pinned ? 'ยกเลิกปักหมุดแล้ว' : 'ปักหมุดแล้ว', 'success')
    }
  }

  const toggleLock = async (post) => {
    const { error } = await supabase.from('forum_posts').update({ is_locked: !post.is_locked }).eq('id', post.id)
    if (!error) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_locked: !p.is_locked } : p))
      toast(post.is_locked ? 'ปลดล็อคแล้ว' : 'ล็อคแล้ว', 'success')
    }
  }

  const filtered = posts.filter(p => {
    const author = p.profiles?.display_name || p.profiles?.username || ''
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      author.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || p.category_id === filterCat
    return matchSearch && matchCat
  })

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการโพสต์ฟอรัม</h1>
        <span className="text-sm text-ptn-muted">{posts.length} โพสต์ทั้งหมด</span>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          placeholder="ค้นหาโพสต์หรือผู้โพสต์..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={14} />}
          className="flex-1 min-w-[200px] max-w-sm"
        />
        <Select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-ptn-border bg-ptn-elevated/50">
            <tr>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider">หัวข้อ</th>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider hidden md:table-cell">หมวดหมู่</th>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider hidden md:table-cell">ผู้โพสต์</th>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider hidden sm:table-cell">วันที่</th>
              <th className="p-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(post => (
              <tr key={post.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                <td className="p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {post.is_pinned && <Pin size={11} className="text-ptn-gold shrink-0" />}
                    {post.is_locked && <Lock size={11} className="text-ptn-muted shrink-0" />}
                    <span className="text-ptn-text font-medium line-clamp-1">{post.title}</span>
                  </div>
                  <span className="text-xs text-ptn-disabled">{post.reply_count || 0} ตอบกลับ</span>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-xs text-ptn-muted">{post.forum_categories?.name || '—'}</span>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-xs text-ptn-muted">
                    {post.profiles?.display_name || post.profiles?.username || '—'}
                  </span>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <span className="text-xs text-ptn-disabled">{formatRelativeTime(post.created_at)}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <Link
                      to={`/forum/${post.forum_categories?.slug}/${post.id}`}
                      target="_blank"
                      className="p-1.5 text-ptn-muted hover:text-ptn-text rounded transition-colors"
                      title="ดูโพสต์"
                    >
                      <Eye size={13} />
                    </Link>
                    <button
                      onClick={() => togglePin(post)}
                      className={`p-1.5 rounded transition-colors ${post.is_pinned ? 'text-ptn-gold' : 'text-ptn-muted hover:text-ptn-gold'}`}
                      title={post.is_pinned ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                    >
                      <Pin size={13} />
                    </button>
                    <button
                      onClick={() => toggleLock(post)}
                      className={`p-1.5 rounded transition-colors ${post.is_locked ? 'text-ptn-muted' : 'text-ptn-muted hover:text-ptn-text'}`}
                      title={post.is_locked ? 'ปลดล็อค' : 'ล็อคกระทู้'}
                    >
                      {post.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      className="p-1.5 text-ptn-muted hover:text-ptn-red rounded transition-colors"
                      title="ลบโพสต์"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ptn-muted">
                  {search || filterCat ? 'ไม่พบโพสต์ที่ตรงกัน' : 'ยังไม่มีโพสต์'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

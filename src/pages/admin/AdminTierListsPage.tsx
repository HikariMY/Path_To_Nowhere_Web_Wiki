// @ts-nocheck
import { useEffect, useState } from 'react'
import { Trash2, Search, Eye, Star, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { formatRelativeTime } from '../../lib/utils'

export function AdminTierListsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [tierLists, setTierLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchTierLists() }, [])

  const fetchTierLists = async () => {
    const { data } = await supabase
      .from('tier_lists')
      .select('id, title, description, is_official, is_public, patch_version, upvotes, created_at, profiles(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(300)
    setTierLists(data || [])
    setLoading(false)
  }

  const handleDelete = async (tl) => {
    if (!confirm(`ยืนยันการลบเทียร์ลิสต์ "${tl.title}"?`)) return
    const { error } = await supabase.from('tier_lists').delete().eq('id', tl.id)
    if (!error) {
      setTierLists(prev => prev.filter(t => t.id !== tl.id))
      toast('ลบเทียร์ลิสต์สำเร็จ', 'success')
      await supabase.from('admin_logs').insert({
        admin_id: profile.id,
        action: `ลบเทียร์ลิสต์: ${tl.title}`,
        target_table: 'tier_lists',
        target_id: tl.id,
      })
    } else {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    }
  }

  const toggleOfficial = async (tl) => {
    const { error } = await supabase.from('tier_lists').update({ is_official: !tl.is_official }).eq('id', tl.id)
    if (!error) {
      setTierLists(prev => prev.map(t => t.id === tl.id ? { ...t, is_official: !t.is_official } : t))
      toast(tl.is_official ? 'ยกเลิก Official แล้ว' : 'ตั้งเป็น Official แล้ว', 'success')
    }
  }

  const filtered = tierLists.filter(tl => {
    const author = tl.profiles?.display_name || tl.profiles?.username || ''
    return !search ||
      tl.title.toLowerCase().includes(search.toLowerCase()) ||
      author.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการเทียร์ลิสต์</h1>
        <span className="text-sm text-ptn-muted">{tierLists.length} เทียร์ลิสต์ทั้งหมด</span>
      </div>

      <div className="mb-4">
        <Input
          placeholder="ค้นหาเทียร์ลิสต์หรือผู้สร้าง..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={14} />}
          className="max-w-sm"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-ptn-border bg-ptn-elevated/50">
            <tr>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider">ชื่อ</th>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider hidden md:table-cell">ผู้สร้าง</th>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider hidden sm:table-cell">คะแนน</th>
              <th className="text-left p-3 text-xs font-semibold text-ptn-muted uppercase tracking-wider hidden sm:table-cell">วันที่</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tl => (
              <tr key={tl.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                <td className="p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {tl.is_official && (
                      <Shield size={11} className="text-ptn-cyan shrink-0" title="Official" />
                    )}
                    <span className="text-ptn-text font-medium line-clamp-1">{tl.title}</span>
                  </div>
                  {tl.patch_version && (
                    <span className="text-xs text-ptn-disabled">Patch {tl.patch_version}</span>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-xs text-ptn-muted">
                    {tl.profiles?.display_name || tl.profiles?.username || '—'}
                  </span>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1">
                    <Star size={11} className="text-ptn-gold" />
                    <span className="text-xs text-ptn-muted">{tl.upvotes || 0}</span>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <span className="text-xs text-ptn-disabled">{formatRelativeTime(tl.created_at)}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <Link
                      to={`/tier-lists/${tl.id}`}
                      target="_blank"
                      className="p-1.5 text-ptn-muted hover:text-ptn-text rounded transition-colors"
                      title="ดูเทียร์ลิสต์"
                    >
                      <Eye size={13} />
                    </Link>
                    <button
                      onClick={() => toggleOfficial(tl)}
                      className={`p-1.5 rounded transition-colors ${tl.is_official ? 'text-ptn-cyan' : 'text-ptn-muted hover:text-ptn-cyan'}`}
                      title={tl.is_official ? 'ยกเลิก Official' : 'ตั้งเป็น Official'}
                    >
                      <Shield size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(tl)}
                      className="p-1.5 text-ptn-muted hover:text-ptn-red rounded transition-colors"
                      title="ลบเทียร์ลิสต์"
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
                  {search ? 'ไม่พบเทียร์ลิสต์ที่ตรงกัน' : 'ยังไม่มีเทียร์ลิสต์'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

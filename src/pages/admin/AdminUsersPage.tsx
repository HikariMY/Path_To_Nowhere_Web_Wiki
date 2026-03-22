// @ts-nocheck
import { useEffect, useState } from 'react'
import { Search, Shield, ShieldOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../lib/utils'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'

export function AdminUsersPage() {
  const { profile: adminProfile } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const changeRole = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    if (userId === adminProfile?.id) { toast('ไม่สามารถเปลี่ยนบทบาทของตัวเองได้', 'error'); return }
    setUpdating(userId)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast(`เปลี่ยนบทบาทสำเร็จ`, 'success')
      await supabase.from('admin_logs').insert({
        admin_id: adminProfile!.id,
        action: `เปลี่ยนบทบาทผู้ใช้ ${userId} เป็น ${newRole}`,
        target_table: 'profiles',
        target_id: userId,
      })
    } else {
      toast('เกิดข้อผิดพลาด', 'error')
    }
    setUpdating(null)
  }

  const filtered = users.filter(u =>
    !search || u.username.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการสมาชิก</h1>
        <span className="text-sm text-ptn-muted">{users.length} คน</span>
      </div>

      <div className="mb-4">
        <Input
          placeholder="ค้นหาสมาชิก..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={14} />}
          className="max-w-sm"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ptn-border bg-ptn-elevated">
                <th className="text-left p-3 text-ptn-muted font-medium">สมาชิก</th>
                <th className="text-left p-3 text-ptn-muted font-medium">บทบาท</th>
                <th className="text-left p-3 text-ptn-muted font-medium hidden sm:table-cell">วันที่สมัคร</th>
                <th className="text-right p-3 text-ptn-muted font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={u.avatar_url} username={u.username} size="sm" />
                      <span className="text-ptn-text font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="role" value={u.role} />
                  </td>
                  <td className="p-3 text-ptn-muted hidden sm:table-cell">
                    {formatDate(u.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={updating === u.id}
                          onClick={() => changeRole(u.id, u.role === 'moderator' ? 'user' : 'moderator')}
                          title={u.role === 'moderator' ? 'ถอดตำแหน่ง' : 'แต่งตั้งเป็นโมเดอ'}
                        >
                          {u.role === 'moderator' ? <ShieldOff size={13} /> : <Shield size={13} />}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-ptn-muted">ไม่พบสมาชิก</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

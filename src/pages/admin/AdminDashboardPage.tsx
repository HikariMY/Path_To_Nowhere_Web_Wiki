import { useEffect, useState } from 'react'
import { Users, Sword, Calendar, MessageSquare, BarChart3, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { formatRelativeTime } from '../../lib/utils'
import type { AdminLog } from '../../types'

interface DashStats {
  users: number
  characters: number
  events: number
  posts: number
  tierLists: number
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashStats>({ users: 0, characters: 0, events: 0, posts: 0, tierLists: 0 })
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const [usersRes, charsRes, eventsRes, postsRes, tiersRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('forum_posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
        supabase.from('tier_lists').select('id', { count: 'exact', head: true }),
        supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10),
      ])
      setStats({
        users: usersRes.count || 0,
        characters: charsRes.count || 0,
        events: eventsRes.count || 0,
        posts: postsRes.count || 0,
        tierLists: tiersRes.count || 0,
      })
      setLogs(logsRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const statCards = [
    { label: 'สมาชิกทั้งหมด', value: stats.users, icon: Users, color: 'text-ptn-cyan', bg: 'bg-ptn-cyan/10' },
    { label: 'ตัวละคร', value: stats.characters, icon: Sword, color: 'text-ptn-red', bg: 'bg-ptn-red/10' },
    { label: 'อีเวนต์', value: stats.events, icon: Calendar, color: 'text-ptn-gold', bg: 'bg-ptn-gold/10' },
    { label: 'กระทู้', value: stats.posts, icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'เทียร์ลิสต์', value: stats.tierLists, icon: BarChart3, color: 'text-ptn-purple', bg: 'bg-ptn-purple/10' },
  ]

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-6">แดชบอร์ด</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div className="font-heading text-2xl font-bold text-ptn-text">{loading ? '...' : value}</div>
            <div className="text-xs text-ptn-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Recent logs */}
      <Card className="p-4">
        <h2 className="font-heading font-semibold text-ptn-text mb-4 flex items-center gap-2">
          <FileText size={16} className="text-ptn-muted" />
          บันทึกกิจกรรมล่าสุด
        </h2>
        {logs.length === 0 ? (
          <p className="text-ptn-muted text-sm text-center py-4">ยังไม่มีบันทึกกิจกรรม</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start justify-between gap-4 py-2 border-b border-ptn-border last:border-0">
                <div>
                  <p className="text-sm text-ptn-text">{log.action}</p>
                  {log.target_table && (
                    <p className="text-xs text-ptn-muted">{log.target_table}</p>
                  )}
                </div>
                <span className="text-xs text-ptn-disabled shrink-0">{formatRelativeTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

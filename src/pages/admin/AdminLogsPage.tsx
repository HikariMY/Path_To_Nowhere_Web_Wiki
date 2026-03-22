import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { AdminLog } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { formatDate } from '../../lib/utils'
import { PAGE_SIZE } from '../../lib/constants'

interface LogWithAdmin extends AdminLog {
  admin: { username: string } | null
}

export function AdminLogsPage() {
  const [logs, setLogs] = useState<LogWithAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('admin_logs')
        .select('*, admin:profiles(username)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

      const newLogs = (data || []) as LogWithAdmin[]
      setLogs(prev => page === 0 ? newLogs : [...prev, ...newLogs])
      setHasMore(newLogs.length === PAGE_SIZE)
      setLoading(false)
    }
    fetch()
  }, [page])

  if (loading && page === 0) return <PageLoader />

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-6 flex items-center gap-2">
        <FileText size={22} className="text-ptn-muted" />
        บันทึกกิจกรรม
      </h1>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ptn-border bg-ptn-elevated">
                <th className="text-left p-3 text-ptn-muted font-medium">เวลา</th>
                <th className="text-left p-3 text-ptn-muted font-medium">ผู้ดูแล</th>
                <th className="text-left p-3 text-ptn-muted font-medium">กิจกรรม</th>
                <th className="text-left p-3 text-ptn-muted font-medium hidden sm:table-cell">ตาราง</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                  <td className="p-3 text-ptn-muted whitespace-nowrap text-xs">
                    {formatDate(log.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 text-ptn-text">{log.admin?.username || '-'}</td>
                  <td className="p-3 text-ptn-text">{log.action}</td>
                  <td className="p-3 text-ptn-muted hidden sm:table-cell">{log.target_table || '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr><td colSpan={4} className="p-8 text-center text-ptn-muted">ยังไม่มีบันทึกกิจกรรม</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {hasMore && (
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => setPage(p => p + 1)} loading={loading}>โหลดเพิ่มเติม</Button>
        </div>
      )}
    </div>
  )
}

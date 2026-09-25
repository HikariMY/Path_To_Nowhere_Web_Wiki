import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { PageLoader } from '../../components/ui/Spinner'
import { callbackError, safeNextPath } from '../../lib/authRedirect'

/**
 * ปลายทางหลังล็อกอิน/เชื่อมบัญชีผ่าน Discord/Google
 * supabase-js อ่าน token จาก URL เอง (detectSessionInUrl) — หน้านี้แค่รอ session แล้วพาไปหน้าเดิม
 */
export function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const handled = useRef(false)

  const error = callbackError(location.search, location.hash)
  const next = safeNextPath(params.get('next'))
  const isLink = params.get('mode') === 'link'

  useEffect(() => {
    if (error || loading || !user || handled.current) return
    handled.current = true
    toast(isLink ? 'เชื่อมบัญชีสำเร็จ!' : 'เข้าสู่ระบบสำเร็จ!', 'success')
    navigate(next, { replace: true })
  }, [error, loading, user, next, isLink, navigate, toast])

  if (!error && (loading || user)) return <PageLoader />

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle size={40} className="mb-4 text-ptn-red" />
      <h1 className="mb-2 font-heading text-xl font-bold text-ptn-text">
        {isLink ? 'เชื่อมบัญชีไม่สำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ'}
      </h1>
      <p className="mb-4 max-w-sm break-words text-sm text-ptn-muted">
        {error ?? 'ไม่พบข้อมูลการเข้าสู่ระบบ ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว'}
      </p>
      <Link to="/login" className="text-ptn-cyan hover:underline">กลับไปหน้าเข้าสู่ระบบ</Link>
    </div>
  )
}

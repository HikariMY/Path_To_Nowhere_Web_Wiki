import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from '../ui/Spinner'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'admin' | 'moderator'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole === 'admin' && profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="text-6xl font-heading font-bold text-ptn-red mb-4">403</div>
        <h1 className="text-xl font-heading font-semibold text-ptn-text mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-ptn-muted">คุณต้องเป็นผู้ดูแลระบบเพื่อเข้าถึงหน้านี้</p>
      </div>
    )
  }

  if (requiredRole === 'moderator' && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="text-6xl font-heading font-bold text-ptn-red mb-4">403</div>
        <h1 className="text-xl font-heading font-semibold text-ptn-text mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-ptn-muted">คุณต้องเป็นโมเดอเรเตอร์หรือผู้ดูแลระบบเพื่อเข้าถึงหน้านี้</p>
      </div>
    )
  }

  return <>{children}</>
}

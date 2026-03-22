import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export function LoginPage() {
  const { signIn } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!email) errs.email = 'กรุณากรอกอีเมล'
    if (!password) errs.password = 'กรุณากรอกรหัสผ่าน'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error')
    } else {
      toast('เข้าสู่ระบบสำเร็จ!', 'success')
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ptn-red shadow-ptn-red">
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold text-ptn-text">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-ptn-muted">ยินดีต้อนรับกลับมา, ผู้บัญชาการ</p>
        </div>

        <div className="rounded-xl border border-ptn-border bg-ptn-surface p-6 shadow-ptn-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="อีเมล"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={15} />}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="รหัสผ่าน"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={15} />}
              error={errors.password}
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              เข้าสู่ระบบ
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-ptn-muted">
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" className="text-ptn-cyan hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </div>
    </div>
  )
}

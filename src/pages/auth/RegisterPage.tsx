import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export function RegisterPage() {
  const { signUp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.username || form.username.length < 3) errs.username = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _'
    if (!form.email) errs.email = 'กรุณากรอกอีเมล'
    if (!form.password || form.password.length < 6) errs.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    if (form.password !== form.confirm) errs.confirm = 'รหัสผ่านไม่ตรงกัน'
    return errs
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.username)
    setLoading(false)

    if (error) {
      if (error.message?.includes('already')) {
        toast('อีเมลนี้ถูกใช้งานแล้ว', 'error')
      } else {
        toast(error.message || 'เกิดข้อผิดพลาด', 'error')
      }
    } else {
      toast('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน', 'success')
      navigate('/login')
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ptn-red shadow-ptn-red">
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold text-ptn-text">สมัครสมาชิก</h1>
          <p className="mt-1 text-sm text-ptn-muted">เข้าร่วมชุมชน PTN Wiki TH</p>
        </div>

        <div className="rounded-xl border border-ptn-border bg-ptn-surface p-6 shadow-ptn-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="ชื่อผู้ใช้"
              type="text"
              placeholder="ชื่อผู้ใช้ (a-z, 0-9, _)"
              value={form.username}
              onChange={set('username')}
              icon={<User size={15} />}
              error={errors.username}
              autoComplete="username"
            />
            <Input
              label="อีเมล"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={set('email')}
              icon={<Mail size={15} />}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="รหัสผ่าน"
              type="password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={form.password}
              onChange={set('password')}
              icon={<Lock size={15} />}
              error={errors.password}
              autoComplete="new-password"
            />
            <Input
              label="ยืนยันรหัสผ่าน"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={set('confirm')}
              icon={<Lock size={15} />}
              error={errors.confirm}
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              สมัครสมาชิก
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-ptn-muted">
          มีบัญชีแล้ว?{' '}
          <Link to="/login" className="text-ptn-cyan hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  )
}

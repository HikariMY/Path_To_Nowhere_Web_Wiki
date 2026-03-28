// @ts-nocheck
import { useState } from 'react'
import { User, Lock, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from '../../components/ui/Avatar'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../components/ui/Toast'

export function SettingsPage() {
  const { profile, user } = useAuth()
  const { toast } = useToast()

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  if (!profile || !user) {
    return (
      <div className="text-center py-20 text-ptn-muted">
        กรุณาเข้าสู่ระบบก่อน
      </div>
    )
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null, bio: bio.trim() || null, avatar_url: avatarUrl || null, updated_at: new Date().toISOString() } as never)
      .eq('id', profile.id)
    setSavingProfile(false)
    if (error) toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    else toast('บันทึกโปรไฟล์สำเร็จ!', 'success')
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error'); return
    }
    if (newPassword !== confirmPassword) {
      toast('รหัสผ่านใหม่ไม่ตรงกัน', 'error'); return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) toast('เปลี่ยนรหัสผ่านล้มเหลว: ' + error.message, 'error')
    else {
      toast('เปลี่ยนรหัสผ่านสำเร็จ!', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-6">ตั้งค่าบัญชี</h1>

      {/* Profile Settings */}
      <Card className="p-6 mb-6">
        <h2 className="font-heading text-lg font-semibold text-ptn-text mb-4 flex items-center gap-2">
          <User size={18} className="text-ptn-cyan" />
          ข้อมูลโปรไฟล์
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-ptn-border">
          <Avatar src={avatarUrl || null} username={profile.username} size="xl" />
          <div className="flex-1">
            <ImageUpload
              bucket="avatars"
              label="รูปโปรไฟล์"
              currentUrl={avatarUrl || null}
              aspectRatio="square"
              onUpload={url => setAvatarUrl(url)}
            />
          </div>
        </div>

        {/* Username (readonly) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ptn-muted mb-1">ชื่อผู้ใช้</label>
          <div className="px-3 py-2 rounded-md border border-ptn-border bg-ptn-elevated text-ptn-disabled text-sm">
            {profile.username}
            <span className="ml-2 text-xs">(เปลี่ยนไม่ได้)</span>
          </div>
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <Input
            label="ชื่อแสดง (Display Name)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={profile.username}
            maxLength={32}
          />
          <p className="text-xs text-ptn-muted mt-1">ชื่อที่แสดงในกระทู้และความคิดเห็น ถ้าไม่กรอกจะใช้ชื่อผู้ใช้แทน</p>
        </div>

        {/* Email (readonly) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ptn-muted mb-1">อีเมล</label>
          <div className="px-3 py-2 rounded-md border border-ptn-border bg-ptn-elevated text-ptn-disabled text-sm">
            {user.email}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-5">
          <Textarea
            label="คำอธิบายตัวเอง (Bio)"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="เขียนอะไรสักอย่างเกี่ยวกับตัวเอง..."
            rows={3}
          />
        </div>

        <Button onClick={handleSaveProfile} loading={savingProfile}>
          <Save size={14} /> บันทึกโปรไฟล์
        </Button>
      </Card>

      {/* Password Settings */}
      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold text-ptn-text mb-4 flex items-center gap-2">
          <Lock size={18} className="text-ptn-red" />
          เปลี่ยนรหัสผ่าน
        </h2>

        <div className="space-y-4 mb-5">
          <Input
            label="รหัสผ่านใหม่"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
          />
          <Input
            label="ยืนยันรหัสผ่านใหม่"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
          />
        </div>

        <Button onClick={handleChangePassword} loading={savingPassword} variant="secondary">
          <Lock size={14} /> เปลี่ยนรหัสผ่าน
        </Button>
      </Card>
    </div>
  )
}

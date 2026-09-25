import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { cn } from '../../lib/utils'
import {
  REPORT_DETAIL_MAX, REPORT_REASONS, REPORT_TARGET_LABEL, describeWriteError,
  type ReportReason, type ReportTargetType,
} from '../../lib/moderation'

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  /** เจ้าของเนื้อหา — ไม่โชว์ปุ่มให้รายงานของตัวเอง */
  authorId?: string
  className?: string
}

/** ปุ่ม "รายงาน" + หน้าต่างเลือกเหตุผล — ส่งเข้าตาราง reports ให้ทีมงานตรวจ */
export function ReportButton({ targetType, targetId, authorId, className }: ReportButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)

  if (user && user.id === authorId) return null

  const label = REPORT_TARGET_LABEL[targetType]

  const handleOpen = () => {
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนรายงาน', 'error')
      navigate('/login')
      return
    }
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setReason(null)
    setDetail('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !reason) return
    setSending(true)
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      detail: detail.trim() || null,
    })
    setSending(false)
    if (error) {
      toast(describeWriteError(error, 'ส่งรายงานไม่สำเร็จ', { duplicate: `คุณรายงาน${label}นี้ไปแล้ว` }), 'error')
      return
    }
    toast('ส่งรายงานแล้ว ทีมงานจะตรวจสอบ', 'success')
    close()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title={`รายงาน${label}`}
        aria-label={`รายงาน${label}`}
        className={cn('flex items-center gap-1 text-xs text-ptn-muted hover:text-ptn-red transition-colors', className)}
      >
        <Flag size={13} /> รายงาน
      </button>

      <Modal open={open} onClose={close} title={`รายงาน${label}`} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm text-ptn-muted">เหตุผล</legend>
            <div className="space-y-1.5">
              {REPORT_REASONS.map(r => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-ptn-text">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-ptn-red"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Textarea
            label="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            maxLength={REPORT_DETAIL_MAX}
            rows={3}
            placeholder="เช่น ผิดตรงไหน หรือลิงก์หลักฐาน"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>ยกเลิก</Button>
            <Button type="submit" variant="danger" disabled={!reason} loading={sending}>ส่งรายงาน</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

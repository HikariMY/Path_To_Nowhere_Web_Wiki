import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useCopyCode, useStatusBar } from '../../hooks/useRedeemCodes'
import { formatRemaining } from '../../lib/redeemCodes'
import { CodePill } from './CodePill'

/** อัปเดตเวลาที่เหลือของอีเวนต์ทุกนาที (แสดงแค่ระดับนาที) */
const TICK_MS = 60_000

/** แถบสถานะใต้เมนู: แพทช์ปัจจุบัน · อีเวนต์ที่ใกล้หมด · Redeem Code กดคัดลอก — ตั้งค่าที่ แอดมิน → Redeem Code */
export function StatusBar() {
  const data = useStatusBar()
  const copy = useCopyCode()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!data?.event) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [data?.event])

  if (!data) return null
  const { status, codes, event } = data
  const eventLeft = event?.end_date ? new Date(event.end_date).getTime() - now : 0
  const showEvent = event && eventLeft > 0
  if (!status.patch_name && !showEvent && codes.length === 0) return null

  return (
    <div className="border-b border-ptn-border bg-ptn-surface/70 text-xs">
      <div className="mx-auto flex min-h-8 max-w-7xl items-center gap-5 overflow-x-auto whitespace-nowrap px-4 py-1 [scrollbar-width:none]">
        {status.patch_name && (
          <span className="inline-flex items-center gap-1.5 text-ptn-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_theme(colors.green.400)] motion-safe:animate-pulse-slow" />
            แพทช์ปัจจุบัน <strong className="font-mono font-semibold text-ptn-text">{status.patch_name}</strong>
          </span>
        )}
        {showEvent && (
          <span className="inline-flex items-center gap-1.5 text-ptn-muted">
            <Clock size={12} className="shrink-0" />
            <span className="max-w-[16rem] truncate">{event.title}</span> หมดใน
            <strong className="font-mono font-semibold text-ptn-text">{formatRemaining(eventLeft)}</strong>
          </span>
        )}
        {codes.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-ptn-muted">
            Redeem:
            {codes.map(c => <CodePill key={c.id} code={c.code} onCopy={copy} />)}
          </span>
        )}
      </div>
    </div>
  )
}

import { useCountdown } from '../../hooks/useCountdown'

interface EventCountdownProps {
  targetDate: string
  label?: string
}

export function EventCountdown({ targetDate, label = 'สิ้นสุดใน' }: EventCountdownProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate)

  if (isExpired) return (
    <span className="text-sm text-ptn-muted">สิ้นสุดแล้ว</span>
  )

  const parts: string[] = []
  if (days > 0)    parts.push(`${days}d`)
  parts.push(`${String(hours).padStart(2, '0')}h`)
  parts.push(`${String(minutes).padStart(2, '0')}m`)
  parts.push(`${String(seconds).padStart(2, '0')}s`)

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ptn-muted">{label}</span>
      <span className="font-heading text-2xl font-bold text-ptn-text tracking-wide">
        {parts.join(' ')}
      </span>
    </div>
  )
}

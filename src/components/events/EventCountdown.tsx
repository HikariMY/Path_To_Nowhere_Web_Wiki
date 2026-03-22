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

  const units = [
    { value: days,    label: 'วัน' },
    { value: hours,   label: 'ชม.' },
    { value: minutes, label: 'นาที' },
    { value: seconds, label: 'วิ.' },
  ]

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ptn-muted">{label}</span>
      <div className="flex items-center gap-1">
        {units.map(({ value, label: unitLabel }, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="min-w-[40px] rounded bg-ptn-elevated border border-ptn-border px-2 py-1 text-center">
              <span className="font-heading text-lg font-bold text-ptn-text leading-none">
                {String(value).padStart(2, '0')}
              </span>
              <div className="text-[10px] text-ptn-disabled">{unitLabel}</div>
            </div>
            {i < units.length - 1 && (
              <span className="text-ptn-red font-bold mb-3">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

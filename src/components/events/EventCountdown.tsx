import { Fragment } from 'react'
import { useCountdown } from '../../hooks/useCountdown'

interface EventCountdownProps {
  targetDate: string
  label?: string
}

const UNITS = [
  { key: 'days',    th: 'วัน'   },
  { key: 'hours',   th: 'ชม.'   },
  { key: 'minutes', th: 'นาที'  },
  { key: 'seconds', th: 'วิ.'   },
] as const

export function EventCountdown({ targetDate, label = 'สิ้นสุดใน' }: EventCountdownProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate)

  if (isExpired) return (
    <span className="text-sm text-ptn-muted">สิ้นสุดแล้ว</span>
  )

  const values: Record<string, number> = { days, hours, minutes, seconds }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium" style={{ color: '#b8a4f0' }}>{label}</span>
      <div className="flex items-center gap-2">
        {UNITS.map(({ key, th }, i) => (
          <Fragment key={key}>
            <div
              className="flex flex-col items-center justify-center rounded-xl"
              style={{
                background: 'rgba(80, 40, 140, 0.85)',
                width: 64,
                height: 64,
                minWidth: 64,
              }}
            >
              <span className="text-2xl font-bold text-white leading-none">
                {String(values[key]).padStart(2, '0')}
              </span>
              <span className="text-xs text-white/70 mt-1">{th}</span>
            </div>
            {i < UNITS.length - 1 && (
              <span className="text-xl font-bold text-white/60 pb-4">:</span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

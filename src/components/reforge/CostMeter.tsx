import { cn } from '../../lib/utils'
import { COST_CAP, COST_LEAP_BONUS } from '../../lib/reforge'

/**
 * แถบ COST แบบในเกม: "COST 21/21(+5)" — 21 คือเพดานรวมที่นับ +5 จากวง COST แล้ว
 * เกินเพดานเป็นสีแดงพร้อมคำเตือน แต่ไม่บล็อก
 */
export function CostMeter({ used }: { used: number }) {
  const cap = COST_CAP
  const over = used > cap
  const full = used === cap

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div
        className={cn(
          'flex items-baseline gap-2 rounded border px-3 py-1 font-heading',
          over ? 'border-red-500/60 bg-red-950/40' : 'border-ptn-border bg-black/40',
        )}
        aria-live="polite"
      >
        <span className="text-xs tracking-widest text-ptn-muted">COST</span>
        <span className={cn('text-lg font-bold', over ? 'text-red-400' : 'text-ptn-text')}>
          {used}/{cap}
          <span className="text-sm text-ptn-muted">(+{COST_LEAP_BONUS})</span>
        </span>
        {full && <span className="text-xs font-bold text-amber-400">MAX</span>}
      </div>
      {over && <p className="text-[11px] text-red-400">เกิน COST ที่ใช้ได้ในเกม {used - cap} แต้ม</p>}
    </div>
  )
}

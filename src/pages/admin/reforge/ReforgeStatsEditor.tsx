import { Plus, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import type { ReforgeStat } from '../../../types/models'

const inputCls = 'rounded border border-ptn-border bg-ptn-elevated px-2 py-1.5 text-sm text-ptn-text outline-none focus:border-ptn-cyan'

/** แก้รายการสเตตัส (label / value / unit) — ใช้ร่วมกันทั้งโหนดและ Reforge Effect */
export function ReforgeStatsEditor({ stats, onChange }: {
  stats: ReforgeStat[]
  onChange: (next: ReforgeStat[]) => void
}) {
  const update = (i: number, patch: Partial<ReforgeStat>) =>
    onChange(stats.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <div className="space-y-1.5">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            className={`${inputCls} min-w-0 flex-1`}
            value={s.label}
            onChange={e => update(i, { label: e.target.value })}
            placeholder="เช่น Attack"
            aria-label="ชื่อสเตตัส"
          />
          <input
            className={`${inputCls} w-20`}
            type="number"
            step="any"
            value={Number.isFinite(s.value) ? s.value : ''}
            onChange={e => update(i, { value: parseFloat(e.target.value) || 0 })}
            aria-label="ค่า"
          />
          <select
            className={`${inputCls} w-16`}
            value={s.unit}
            onChange={e => update(i, { unit: e.target.value as ReforgeStat['unit'] })}
            aria-label="หน่วย"
          >
            <option value="percent">%</option>
            <option value="flat">+</option>
          </select>
          <button
            type="button"
            onClick={() => onChange(stats.filter((_, j) => j !== i))}
            className="p-1 text-ptn-muted hover:text-red-400"
            aria-label="ลบสเตตัส"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...stats, { label: '', value: 0, unit: 'percent' }])}
      >
        <Plus size={13} /> เพิ่มสเตตัส
      </Button>
    </div>
  )
}

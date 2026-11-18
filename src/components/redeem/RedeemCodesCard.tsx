import { Copy } from 'lucide-react'
import { useCopyCode, useRedeemCodes } from '../../hooks/useRedeemCodes'
import { formatDate } from '../../lib/utils'

/** กล่อง Redeem Code ในหน้าแรก — ไม่มีโค้ดที่ใช้ได้ = ไม่แสดงกล่อง */
export function RedeemCodesCard() {
  const codes = useRedeemCodes()
  const copy = useCopyCode()
  if (!codes || codes.length === 0) return null

  return (
    <div className="slash-panel mt-6 rounded-lg border border-ptn-border bg-ptn-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-ptn-text">
        <div className="h-1 w-4 rounded bg-ptn-red" />
        Redeem Code
      </h3>
      <ul className="space-y-2">
        {codes.map(c => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded border border-dashed border-ptn-border bg-ptn-bg/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-ptn-gold">{c.code}</p>
              {(c.reward || c.expires_at) && (
                <p className="truncate text-[11px] text-ptn-muted">
                  {c.reward}
                  {c.reward && c.expires_at && ' · '}
                  {c.expires_at && `ใช้ได้ถึง ${formatDate(c.expires_at, { month: 'short' })}`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => copy(c.code)}
              className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-ptn-muted transition-colors hover:bg-ptn-elevated hover:text-ptn-text"
            >
              <Copy size={12} /> คัดลอก
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

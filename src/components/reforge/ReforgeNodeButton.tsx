import { cn } from '../../lib/utils'
import type { ReforgeNode } from '../../types/models'
import { COST_BADGE, displayName, nodeRingColor } from './reforgeStyle'

/** โหนดวงกลม + badge COST มุมขวาบน + ชื่อใต้โหนด — กดเพื่อเลือกดูรายละเอียด, ดับเบิลคลิกเพื่อเปิด/ปิด */
export function ReforgeNodeButton({ node, active, selected, onSelect, onToggle, labelPosition = 'bottom' }: {
  node: ReforgeNode
  active: boolean
  selected: boolean
  onSelect: () => void
  onToggle: () => void
  labelPosition?: 'top' | 'bottom'
}) {
  const ring = nodeRingColor(node)
  const label = (
    <span className="block max-w-[7rem] text-center text-[11px] leading-tight text-ptn-text/90">
      {displayName(node)}
    </span>
  )

  return (
    <div className="flex flex-col items-center gap-1">
      {labelPosition === 'top' && label}
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onToggle}
        aria-pressed={active}
        aria-label={`${node.name} (COST ${node.cost})${active ? ' — เปิดอยู่' : ''}`}
        className={cn(
          'relative h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 bg-black/60 transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan',
          active ? 'opacity-100' : 'opacity-45 grayscale hover:opacity-80',
          selected && 'scale-110',
        )}
        style={{
          borderColor: ring,
          boxShadow: active ? `0 0 14px ${ring}99, inset 0 0 10px ${ring}55` : undefined,
        }}
      >
        {node.icon_url ? (
          <img src={node.icon_url} alt="" className="h-full w-full rounded-full object-contain p-1.5" />
        ) : (
          <span className="font-heading text-lg font-bold" style={{ color: ring }}>
            {node.name.charAt(0)}
          </span>
        )}
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-black bg-black font-heading text-xs font-bold"
          style={{ color: active ? COST_BADGE : '#9ca3af' }}
        >
          {node.cost}
        </span>
      </button>
      {labelPosition === 'bottom' && label}
    </div>
  )
}

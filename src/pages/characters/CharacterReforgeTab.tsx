import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2, List, Network, RotateCcw, Sparkles, Star } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { activateAll, decodeBuild, encodeBuild, toggleNode, totalCost } from '../../lib/reforge'
import { useExAnchorOptions } from '../../hooks/useExAnchorOptions'
import type { ReforgeData, ReforgeGuideBuild } from '../../types/models'
import { ReforgeTree, type ReforgeSelection } from '../../components/reforge/ReforgeTree'
import { ReforgeDetailPanel } from '../../components/reforge/ReforgeDetailPanel'
import { ReforgeOverview } from '../../components/reforge/ReforgeOverview'
import { CostMeter } from '../../components/reforge/CostMeter'
import { displayName } from '../../components/reforge/reforgeStyle'

type View = 'tree' | 'list'

/**
 * แท็บ Reforge — ผู้เล่นเปิด/ปิดโหนดได้อิสระเพื่อดูผลตอนปลดครบก่อนไปทำในเกม
 * build เก็บใน URL (?build=a.b.c&ex=<character_id>) เพื่อแชร์ลิงก์ได้ ไม่บันทึกลง DB
 */
export function CharacterReforgeTab({ character, data, initialBuild = null }: {
  character: { id: string; name: string; job_class: string }
  data: ReforgeData
  /** build ที่ส่งมาจากปุ่มในไกด์ — มาก่อน URL */
  initialBuild?: ReforgeGuideBuild | null
}) {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // ลำดับความสำคัญ: build จากไกด์ > ?build= ใน URL > Recommended Set ชุดแรก
  const [activeIds, setActiveIds] = useState<string[]>(() => {
    if (initialBuild) return decodeBuild(data, encodeBuild(initialBuild.nodes))
    const fromUrl = decodeBuild(data, searchParams.get('build'))
    if (fromUrl.length > 0) return fromUrl
    return decodeBuild(data, encodeBuild(data.presets[0]?.node_ids ?? []))
  })
  const [exId, setExId] = useState<string | null>(() => {
    if (initialBuild) return initialBuild.ex
    return searchParams.get('ex') ?? (data.ex_anchor ? character.id : null)
  })
  const [selection, setSelection] = useState<ReforgeSelection>(null)
  const [view, setView] = useState<View>('tree')
  const exOptions = useExAnchorOptions(character.job_class)

  // ซิงก์ build ลง URL (replace — ไม่ให้ปุ่มย้อนกลับเต็มไปด้วยทุกคลิก)
  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (activeIds.length > 0) next.set('build', encodeBuild(activeIds))
      else next.delete('build')
      if (exId) next.set('ex', exId)
      else next.delete('ex')
      return next
    }, { replace: true })
  }, [activeIds, exId, setSearchParams])

  const ex = useMemo(() => exOptions.find(o => o.character_id === exId) ?? null, [exOptions, exId])
  const used = totalCost(data, activeIds)
  const onToggle = (nodeId: string) => setActiveIds(prev => toggleNode(data, prev, nodeId))

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('คัดลอกลิงก์ build แล้ว', 'success')
    } catch {
      toast('คัดลอกไม่สำเร็จ — คัดลอกจากแถบที่อยู่แทนได้', 'error')
    }
  }

  const exSlot = data.ex_anchor || exOptions.length > 0 ? (
    <button
      type="button"
      onClick={() => setSelection({ kind: 'ex' })}
      aria-label="เลือก Overlimit Anchor"
      className={cn(
        'relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-pink-400 bg-black/60 transition-transform',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan',
        selection?.kind === 'ex' && 'scale-110',
        ex ? 'shadow-[0_0_18px_#f472b6]' : 'opacity-50',
      )}
    >
      {ex?.anchor.icon_url
        ? <img src={ex.anchor.icon_url} alt="" className="h-full w-full rounded-full object-contain p-2" />
        : <span className="font-heading text-2xl font-black italic text-pink-400">EX</span>}
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-black bg-black text-xs font-bold text-amber-400">0</span>
    </button>
  ) : undefined

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setActiveIds(activateAll(data))}>
            <Sparkles size={14} /> เปิดทั้งหมด
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveIds([])}>
            <RotateCcw size={14} /> ล้าง
          </Button>
          {data.presets.map(p => (
            <Button key={p.id} size="sm" variant="cyan" onClick={() => setActiveIds(decodeBuild(data, encodeBuild(p.node_ids)))}>
              <Star size={14} /> {p.name}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Link2 size={14} /> แชร์ build
          </Button>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex overflow-hidden rounded border border-ptn-border" role="group" aria-label="มุมมอง">
            {([['tree', Network, 'ต้นไม้'], ['list', List, 'รายการ']] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs', view === v ? 'bg-ptn-red text-white' : 'text-ptn-muted hover:text-ptn-text')}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <CostMeter used={used} base={data.cost_base} bonus={data.cost_bonus} />
        </div>
      </div>

      {view === 'tree' ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ReforgeTree
            data={data}
            activeIds={activeIds}
            selection={selection}
            onSelect={setSelection}
            onToggle={onToggle}
            exSlot={exSlot}
          />
          <ReforgeDetailPanel
            data={data}
            activeIds={activeIds}
            selection={selection}
            onToggle={onToggle}
            exOptions={exOptions}
            exId={exId}
            onPickEx={setExId}
          />
        </div>
      ) : (
        <ReforgeOverview data={data} activeIds={activeIds} onToggle={onToggle} ex={ex} />
      )}

      {data.ex_anchor && (
        <p className="text-xs text-ptn-disabled">
          EX ของ {character.name}: <span className="text-ptn-muted">{displayName(data.ex_anchor)}</span>
        </p>
      )}
    </div>
  )
}

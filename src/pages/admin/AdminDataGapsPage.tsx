import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Edit2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { cn } from '../../lib/utils'
import { DATA_CHECKS, findDataGaps, type DataCheckKey, type DataGap, type GapCharacter } from '../../lib/dataGaps'

const GAP_COLUMNS =
  'id, slug, name, portrait_url, overview, release_date, stats, skills, shackles, ability_tags, is_unreleased, release_order, created_at'
const PAGE_SIZE = 1000
const LABEL = new Map(DATA_CHECKS.map(c => [c.key, c.label]))

/**
 * นับ build ต่อตัวละคร — ดึงทีละหน้าเพราะ Supabase คืนได้ไม่เกิน Max Rows ต่อครั้ง
 * เลื่อนตามจำนวนแถวที่ได้จริง และหยุดเมื่อได้หน้าว่าง (Max Rows อาจตั้งต่ำกว่า PAGE_SIZE)
 */
async function fetchBuildCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  let fetched = 0
  while (true) {
    const { data, error } = await supabase
      .from('character_crimebrand_builds')
      .select('character_id')
      .order('id')
      .range(fetched, fetched + PAGE_SIZE - 1)
    if (error) throw error
    if (data.length === 0) return counts
    for (const row of data as { character_id: string }[]) {
      counts.set(row.character_id, (counts.get(row.character_id) ?? 0) + 1)
    }
    fetched += data.length
  }
}

async function loadGaps(): Promise<{ gaps: DataGap[]; released: number }> {
  const [charsRes, buildCounts] = await Promise.all([
    supabase.from('characters').select(GAP_COLUMNS),
    fetchBuildCounts(),
  ])
  if (charsRes.error) throw charsRes.error
  const chars = (charsRes.data ?? []) as GapCharacter[]
  return { gaps: findDataGaps(chars, buildCounts), released: chars.filter(c => !c.is_unreleased).length }
}

/** รายงานตัวละครที่ออกแล้วแต่ข้อมูลยังไม่ครบ — กดแก้ไขแล้วไปเปิดตัวนั้นในหน้าจัดการตัวละครเลย */
export function AdminDataGapsPage() {
  const [result, setResult] = useState<{ gaps: DataGap[]; released: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [filter, setFilter] = useState<DataCheckKey | null>(null)

  useEffect(() => {
    let active = true
    loadGaps()
      .then(data => { if (active) { setResult(data); setFailed(false) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [reloadKey])

  const countByCheck = useMemo(() => {
    const counts = new Map<DataCheckKey, number>()
    for (const gap of result?.gaps ?? []) for (const key of gap.missing) counts.set(key, (counts.get(key) ?? 0) + 1)
    return counts
  }, [result])

  if (failed) {
    return (
      <Card className="p-6 text-center text-sm text-ptn-muted">
        โหลดรายงานไม่สำเร็จ
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={() => { setFailed(false); setReloadKey(k => k + 1) }}>ลองใหม่</Button>
        </div>
      </Card>
    )
  }
  if (!result) return <PageLoader />

  const visible = filter ? result.gaps.filter(g => g.missing.includes(filter)) : result.gaps

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-1 flex items-center gap-2">
        <ClipboardList size={22} className="text-ptn-gold" /> ข้อมูลที่ขาด
      </h1>
      <p className="text-sm text-ptn-muted mb-5">
        ตัวละครที่ออกแล้ว {result.released} ตัว — ข้อมูลยังไม่ครบ {result.gaps.length} ตัว (ตัวใหม่สุดขึ้นก่อน)
      </p>

      <div role="group" aria-label="กรองตามข้อมูลที่ขาด" className="flex flex-wrap gap-2 mb-5">
        {DATA_CHECKS.map(check => {
          const count = countByCheck.get(check.key) ?? 0
          const active = filter === check.key
          return (
            <button
              key={check.key}
              onClick={() => setFilter(active ? null : check.key)}
              aria-pressed={active}
              disabled={count === 0}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40',
                active ? 'border-ptn-gold bg-ptn-gold/15 text-ptn-text' : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
              )}
            >
              ขาด{check.label} · {count}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ptn-muted">ข้อมูลครบทุกตัวแล้ว</Card>
      ) : (
        <Card className="divide-y divide-ptn-border">
          {visible.map(({ character, missing }) => (
            <div key={character.id} className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-ptn-elevated">
                {character.portrait_url && (
                  <img src={character.portrait_url} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ptn-text truncate">{character.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {missing.map(key => (
                    <span key={key} className="rounded bg-ptn-red/10 px-1.5 py-0.5 text-[11px] text-ptn-red">
                      {LABEL.get(key)}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to={`/admin/characters?char=${encodeURIComponent(character.slug)}`}
                className="flex shrink-0 items-center gap-1 rounded border border-ptn-border px-2.5 py-1.5 text-xs text-ptn-muted hover:text-ptn-text"
              >
                <Edit2 size={12} /> แก้ไข
              </Link>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

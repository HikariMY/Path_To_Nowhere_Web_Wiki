import { useEffect, useState, type ComponentProps } from 'react'
import { ExternalLink, Users, Globe2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { readPoints } from '../../lib/cnGuides'
import { safeHttpUrl } from '../../lib/tierList'
import type { CharacterCnGuideRow } from '../../types'
import { Card } from '../../components/ui/Card'
import { CharacterGuidesTab } from './CharacterGuidesTab'
import { OfficialTierRank } from '../../components/tier-lists/OfficialTierRank'

type Source = 'web' | 'cn'

/**
 * แท็บไกด์ของทุกตัวละคร: สลับระหว่าง "ไกด์จากผู้เล่นในเว็บ" (ระบบไกด์เดิม) กับ "ข้อมูลจากผู้เล่นจีน"
 * ไกด์เดิมเปิดค้างไว้ตลอด (ซ่อนตอนดูฝั่งจีน) ร่างที่พิมพ์ค้างจะได้ไม่หาย
 */
export function CharacterGuidesSection({ characterName, initialSource = 'web', ...guidesProps }: ComponentProps<typeof CharacterGuidesTab> & {
  characterName: string
  initialSource?: Source
}) {
  const { characterId } = guidesProps
  const [source, setSource] = useState<Source>(initialSource)
  const [webCount, setWebCount] = useState<number | null>(null)
  const [cnGuides, setCnGuides] = useState<CharacterCnGuideRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    // ยังไม่ได้รัน supabase_migration_cn_guides.sql → โหลดไม่ได้ ถือว่ายังไม่มีข้อมูล (ไม่ทำให้หน้าพัง)
    supabase.from('character_cn_guides').select('*').eq('character_id', characterId)
      .order('sort_order').order('created_at')
      .then(({ data, error }) => { if (!cancelled) setCnGuides(error ? [] : (data || []) as CharacterCnGuideRow[]) })
    return () => { cancelled = true }
  }, [characterId])

  const tab = (key: Source, label: string, Icon: typeof Users, count: number | null) => (
    <button
      type="button"
      role="tab"
      aria-selected={source === key}
      onClick={() => setSource(key)}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
        source === key ? 'bg-ptn-red text-white' : 'text-ptn-muted hover:text-ptn-text',
      )}
    >
      <Icon size={14} /> {label}
      {count !== null && (
        <span className={cn('rounded px-1.5 font-mono text-[11px]', source === key ? 'bg-black/25' : 'bg-ptn-elevated')}>{count}</span>
      )}
    </button>
  )

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="แหล่งไกด์" className="flex gap-1 rounded-lg border border-ptn-border bg-ptn-surface p-1 sm:w-fit">
        {tab('web', 'ไกด์จากผู้เล่นในเว็บ', Users, webCount)}
        {tab('cn', 'ข้อมูลจากผู้เล่นจีน', Globe2, cnGuides ? cnGuides.length : null)}
      </div>

      <div className={cn('space-y-4', source !== 'web' && 'hidden')}>
        <OfficialTierRank characterId={characterId} server="global" />
        <CharacterGuidesTab {...guidesProps} onCountChange={setWebCount} />
      </div>

      {source === 'cn' && (
        <div className="space-y-4">
          <OfficialTierRank characterId={characterId} server="cn" />
          {cnGuides && cnGuides.length > 0
            ? cnGuides.map(g => <CnGuideCard key={g.id} guide={g} />)
            : (
              <Card className="p-6 text-center">
                <p className="text-ptn-text">ยังไม่มีสรุปไกด์จากผู้เล่นจีนสำหรับ {characterName}</p>
                <p className="mt-1 text-xs text-ptn-muted">ทีมงานสรุปด้วยคำของเราเองพร้อมเครดิตและลิงก์ต้นฉบับ ถ้าเจอไกด์จีนที่น่าสนใจ แจ้งทีมงานได้ที่ฟอรัม</p>
              </Card>
            )}
          <p className="text-xs text-ptn-disabled">
            สรุปโดยทีม Project Duck จากต้นฉบับภาษาจีน ไม่ใช่คำแปลทั้งบท อ่านรายละเอียดเต็มที่ลิงก์ต้นฉบับ · ข้อมูลเซิร์ฟจีนอาจมาก่อนหรือต่างจากเซิร์ฟ Global
          </p>
        </div>
      )}
    </div>
  )
}

function CnGuideCard({ guide }: { guide: CharacterCnGuideRow }) {
  const points = readPoints(guide.points)
  const url = safeHttpUrl(guide.source_url)
  return (
    <Card className="overflow-hidden border-l-2 border-l-ptn-red">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ptn-border px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ptn-muted">มุมมองจากผู้เล่นจีน</p>
        <span className="rounded border border-ptn-red/25 bg-ptn-red/10 px-2 py-0.5 text-xs text-ptn-red">ข้อมูลเซิร์ฟจีน</span>
      </div>
      <div className="space-y-3 p-4">
        {guide.verdict && (
          <p className="font-heading font-bold text-ptn-text">สรุป: <span className="text-ptn-gold">{guide.verdict}</span></p>
        )}
        <dl className="divide-y divide-ptn-border/60">
          {points.map((p, i) => (
            <div key={i} className="grid gap-1 py-2 sm:grid-cols-[8rem_1fr] sm:gap-3">
              {p.title && <dt className="text-sm text-ptn-muted">{p.title}</dt>}
              <dd className={cn('text-sm text-ptn-text', !p.title && 'sm:col-span-2')}>{p.body}</dd>
            </div>
          ))}
        </dl>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 rounded border border-ptn-border bg-ptn-elevated/50 px-3 py-2 text-sm text-ptn-text hover:border-ptn-muted">
            <ExternalLink size={14} className="mt-0.5 shrink-0 text-ptn-muted" />
            <span className="min-w-0">
              <b className="break-words">{guide.source_title}</b>
              <span className="block text-xs text-ptn-muted">โดย {guide.source_author} · ตรวจล่าสุด {guide.checked_at}</span>
            </span>
          </a>
        )}
      </div>
    </Card>
  )
}

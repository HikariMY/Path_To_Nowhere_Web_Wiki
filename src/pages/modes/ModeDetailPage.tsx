import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { GameModeRow, GameModeSourceRow } from '../../types'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { EventCountdown } from '../../components/events/EventCountdown'
import { readPoints, type CnPoint } from '../../lib/cnGuides'
import { hasCnInfo, readShots, readStages, readStrings } from '../../lib/gameModes'
import { safeHttpUrl } from '../../lib/tierList'
import { ModePath, ModeStatusBadges } from './ModeParts'

type OtherMode = Pick<GameModeRow, 'slug' | 'name' | 'global_menu' | 'tag'>

const fmtEnds = (iso: string) => new Date(iso).toLocaleString('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
})

function Section({ title, badge, className, children }: { title: string; badge?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Card className={`p-4 sm:p-5 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ptn-muted">{title}</h2>
        {badge}
      </div>
      {children}
    </Card>
  )
}

const GlobalBadge = () => <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">Global</span>
const CnBadge = () => <span className="rounded border border-ptn-red/25 bg-ptn-red/10 px-2 py-0.5 text-xs text-ptn-red">ข้อมูลเซิร์ฟจีน</span>

function Rules({ rows }: { rows: CnPoint[] }) {
  if (!rows.length) return null
  return (
    <dl className="divide-y divide-ptn-border/60">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1 py-2 sm:grid-cols-[9rem_1fr] sm:gap-3">
          {r.title && <dt className="text-sm text-ptn-muted">{r.title}</dt>}
          <dd className={`text-sm text-ptn-text ${r.title ? '' : 'sm:col-span-2'}`}>{r.body}</dd>
        </div>
      ))}
    </dl>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-ptn-text"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-ptn-red" />{t}</li>
      ))}
    </ul>
  )
}

/** หน้ารายละเอียดโหมด: Global ก่อน (ระบบ · รอบปัจจุบัน · ภาพจากในเกม) แล้วข้อมูลเซิร์ฟจีนแยกเป็นกล่อง "ล่วงหน้า" */
export function ModeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [mode, setMode] = useState<GameModeRow | null>(null)
  const [sources, setSources] = useState<GameModeSourceRow[]>([])
  const [others, setOthers] = useState<OtherMode[]>([])
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('game_modes').select('*').eq('slug', slug ?? '').maybeSingle()
      const row = (data as GameModeRow | null) ?? null
      const [{ data: src }, { data: all }] = await Promise.all([
        row ? supabase.from('game_mode_sources').select('*').eq('mode_id', row.id).order('sort_order') : Promise.resolve({ data: [] }),
        supabase.from('game_modes').select('slug, name, global_menu, tag').order('sort_order').order('name'),
      ])
      if (cancelled) return
      setMode(row)
      setSources((src || []) as GameModeSourceRow[])
      setOthers(((all || []) as OtherMode[]).filter(o => o.slug !== slug))
      setLoadedSlug(slug ?? null)
    })()
    return () => { cancelled = true }
  }, [slug])

  if (loadedSlug !== slug) return <PageLoader />
  if (!mode) return (
    <div className="py-20 text-center text-ptn-muted">
      ไม่พบโหมดนี้ <Link to="/modes" className="ml-2 text-ptn-cyan hover:underline">กลับไปหน้าไกด์โหมด</Link>
    </div>
  )

  const rules = readPoints(mode.global_rules)
  const stages = readStages(mode.stages)
  const bosses = readStrings(mode.season_bosses)
  const tips = readStrings(mode.tips)
  const shots = readShots(mode.shots)
  const cnRules = readPoints(mode.cn_rules)
  const cnBuffs = readPoints(mode.cn_buffs)
  const cnTips = readStrings(mode.cn_tips)
  const stagesWithDetail = stages.every(s => s.body)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/modes" className="mb-6 flex w-fit items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text">
        <ChevronLeft size={16} /> ไกด์โหมด
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {mode.tag && <p className="font-mono text-xs font-bold uppercase tracking-wider text-ptn-muted">{mode.tag}</p>}
          <h1 className="font-heading text-3xl font-bold italic text-ptn-text sm:text-4xl">{mode.name}</h1>
          {mode.summary && <p className="max-w-3xl text-ptn-muted">{mode.summary}</p>}
          <ModePath path={mode.path} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ModeStatusBadges mode={mode} />
          {hasCnInfo(mode) && <CnBadge />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-4">
          {mode.in_global && (rules.length > 0 || stages.length > 0) && (
            <Section title="ระบบของโหมดนี้" badge={<GlobalBadge />} className="border-l-2 border-l-ptn-red">
              <Rules rows={rules} />
              {stages.length > 0 && (
                <div className="mt-4">
                  {mode.stages_title && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ptn-muted">{mode.stages_title}</p>}
                  {stagesWithDetail
                    ? <Rules rows={stages} />
                    : (
                      <div className="flex flex-wrap gap-1.5">
                        {stages.map((s, i) => <span key={i} className="rounded border border-ptn-border bg-ptn-elevated px-2 py-0.5 text-xs text-ptn-text">{s.title}{s.body ? ` · ${s.body}` : ''}</span>)}
                      </div>
                    )}
                </div>
              )}
            </Section>
          )}

          {mode.in_global && mode.season_label && (
            <Section title="รอบปัจจุบัน" badge={<GlobalBadge />}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-heading text-2xl font-bold italic text-ptn-text">{mode.season_label}</p>
                  {mode.season_trait && <p className="text-sm text-ptn-muted">Trait <b className="text-ptn-gold">{mode.season_trait}</b></p>}
                </div>
                {mode.season_ends && <p className="text-xs text-ptn-muted">สิ้นสุด {fmtEnds(mode.season_ends)} น.</p>}
              </div>
              {mode.season_ends && <EventCountdown targetDate={mode.season_ends} />}
              {bosses.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ptn-muted">Boss</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bosses.map(b => <span key={b} className="rounded border border-ptn-red/25 bg-ptn-red/10 px-2 py-0.5 font-mono text-xs text-ptn-red">{b}</span>)}
                  </div>
                </div>
              )}
            </Section>
          )}

          {shots.length > 0 && (
            <Section title="ภาพจากในเกม" badge={<GlobalBadge />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {shots.map(s => (
                  <figure key={s.url} className="space-y-1">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded border border-ptn-border">
                      <img src={s.url} alt={s.caption} loading="lazy" className="aspect-video w-full object-cover transition-transform hover:scale-[1.03]" />
                    </a>
                    {s.caption && <figcaption className="text-xs text-ptn-muted">{s.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </Section>
          )}

          {hasCnInfo(mode) && (
            <Section title="ข้อมูลเซิร์ฟจีน (ล่วงหน้า)" badge={<CnBadge />} className="border-l-2 border-l-ptn-red">
              <p className="mb-3 text-xs text-ptn-disabled">
                {mode.in_global
                  ? 'เซิร์ฟจีนนำหน้า Global อยู่หลาย Season ระบบหรือตัวเลขอาจต่างจากที่เห็นในเกมตอนนี้'
                  : 'ยังไม่พบโหมดนี้ในเซิร์ฟ Global ข้อมูลด้านล่างมาจากเซิร์ฟจีนทั้งหมด'}
              </p>
              {mode.cn_note && <p className="mb-3 border-l-2 border-ptn-gold bg-ptn-gold/10 px-3 py-2 text-sm text-ptn-gold">{mode.cn_note}</p>}
              <Rules rows={cnRules} />
              {(mode.cn_season_label || mode.cn_season_effect || cnBuffs.length > 0) && (
                <div className="mt-4 space-y-2">
                  {mode.cn_season_label && <span className="rounded border border-ptn-gold/25 bg-ptn-gold/10 px-2 py-0.5 text-xs text-ptn-gold">{mode.cn_season_label}</span>}
                  {mode.cn_season_effect && <p className="text-sm text-ptn-text">{mode.cn_season_effect}</p>}
                  <Rules rows={cnBuffs} />
                </div>
              )}
              {cnTips.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ptn-muted">เคล็ดลับจากผู้เล่นจีน</p>
                  <Bullets items={cnTips} />
                </div>
              )}
            </Section>
          )}

          {tips.length > 0 && (
            <Section title="เคล็ดลับ"><Bullets items={tips} /></Section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Section title="แหล่งอ้างอิง">
            {sources.length > 0 ? (
              <div className="space-y-2">
                {sources.map(s => {
                  const url = safeHttpUrl(s.url)
                  if (!url) return null
                  return (
                    <a key={s.id} href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 rounded border-l-2 border-ptn-red bg-ptn-elevated/50 px-3 py-2 text-sm text-ptn-text hover:bg-ptn-elevated">
                      <ExternalLink size={13} className="mt-0.5 shrink-0 text-ptn-muted" />
                      <span className="min-w-0"><b className="break-words">{s.title}</b><span className="block text-xs text-ptn-muted">โดย {s.author} · ตรวจล่าสุด {s.checked_at}</span></span>
                    </a>
                  )
                })}
                <p className="text-xs text-ptn-disabled">สรุปโดยทีม Project Duck จากต้นฉบับภาษาจีน ไม่ใช่คำแปลทั้งบท อ่านรายละเอียดเต็มที่ลิงก์ต้นฉบับ</p>
              </div>
            ) : (
              <p className="text-xs text-ptn-muted">ข้อมูลหน้านี้ทีมงานเช็กจากในเกมเซิร์ฟ Global โดยตรง</p>
            )}
          </Section>
          {others.length > 0 && (
            <Section title="โหมดอื่น">
              <div className="divide-y divide-ptn-border/60">
                {others.map(o => (
                  <Link key={o.slug} to={`/modes/${o.slug}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-ptn-red">
                    <b className="text-ptn-text">{o.name}</b>
                    <span className="text-xs text-ptn-muted">{o.global_menu || o.tag}</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </aside>
      </div>
    </div>
  )
}

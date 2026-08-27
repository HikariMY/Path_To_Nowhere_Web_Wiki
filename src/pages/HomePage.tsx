import { useEffect, useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, BarChart3, MessageSquare, ChevronRight, Clock, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { GameEvent } from '../types'
import { HeroCarousel } from '../components/events/HeroCarousel'
import { Card } from '../components/ui/Card'
import { cn, formatDate } from '../lib/utils'
import { useCountdown } from '../hooks/useCountdown'
import { PageLoader } from '../components/ui/Spinner'
import { EVENT_TYPE_LABEL } from '../lib/constants'

type CharOption = { id: string; name: string; portrait_url: string | null; slug: string }

interface Stats {
  characters: number
  events: number
  posts: number
  tierLists: number
}

type Announcement = { id: string; content: string }

/** จำนวนการ์ดอีเวนต์ที่โชว์ก่อนต้องกด "ดูเพิ่ม" — กันหน้าแรกยาวเกินจนเสียสมดุลกับคอลัมน์ขวา */
const VISIBLE_EVENTS = 3

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', content: 'PTN Wiki TH เปิดให้บริการแล้ว!' },
  { id: '2', content: 'ข้อมูลตัวละครกว่า 40 ตัว ภาษาไทยครบถ้วน' },
  { id: '3', content: 'ร่วมสร้างเทียร์ลิสต์ของชุมชนได้แล้ว' },
]

// ค่าตั้งต้นของฟิลด์ที่ demo event ไม่ได้ใช้ — กันไม่ให้ต้องเขียนซ้ำทุกก้อน
const DEMO_EVENT_BASE = {
  subtitle: null,
  is_featured: false,
  image_position: '50% 50%',
  featured_character_ids: null,
  featured_character_images: null,
} satisfies Partial<GameEvent>

// Fallback demo events — synced with s1n.gg data (as of 2026-03-22)
const DEMO_EVENTS: GameEvent[] = [
  {
    ...DEMO_EVENT_BASE,
    id: '1',
    title: 'Midnight Silhouette — คิสึกิ ฮิโตมิ',
    description: 'อีเวนต์สุ่มตัวละคร S-Rank ใหม่ Kisugi Hitomi ผู้มีพลังพิเศษอันลึกลับแห่งราตรี ร่วมเดินทางและไขปริศนาแห่งเงาในคืนมืด',
    event_type: 'story',
    banner_url: null,
    start_date: '2026-03-08T04:00:00Z',
    end_date: '2026-04-07T13:00:00Z',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    ...DEMO_EVENT_BASE,
    id: '2',
    title: 'Velvet Nightglow — คิสึกิ รุย',
    description: 'อีเวนต์สุ่มตัวละคร S-Rank Kisugi Rui แห่งแสงกำมะหยี่ยามค่ำคืน สัมผัสพลังของตระกูล Kisugi ทั้งสองพี่น้องในอีเวนต์นี้',
    event_type: 'story',
    banner_url: null,
    start_date: '2026-03-08T04:00:00Z',
    end_date: '2026-04-07T13:00:00Z',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    ...DEMO_EVENT_BASE,
    id: '3',
    title: 'Jelena & Raven — Directional',
    description: 'อีเวนต์ Directional สุ่มตัวละคร A-Rank Jelena และ Raven ทั้งคู่พร้อมกัน โอกาสพิเศษในการรับตัวละครหายากทั้งสองในคราวเดียว',
    event_type: 'other',
    banner_url: null,
    start_date: '2026-03-08T04:00:00Z',
    end_date: '2026-04-07T13:00:00Z',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    ...DEMO_EVENT_BASE,
    id: '4',
    title: 'Rebellious Uproar — Synex รีรัน',
    description: 'รีรัน Routine สุ่มตัวละคร S-Rank Synex กลับมาอีกครั้ง! หากพลาดครั้งก่อน นี่คือโอกาสของคุณในการรับ Synex มาร่วมทีม',
    event_type: 'rerun',
    banner_url: null,
    start_date: '2026-03-24T13:00:00Z',
    end_date: '2026-04-07T13:00:00Z',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    ...DEMO_EVENT_BASE,
    id: '5',
    title: 'Lichen — อีเวนต์ใหม่',
    description: 'อีเวนต์สุ่มตัวละคร S-Rank ใหม่ Lichen กำลังจะมาในเร็วๆ นี้ เตรียมพลังงานและสะสมทรัพยากรให้พร้อม',
    event_type: 'story',
    banner_url: null,
    start_date: '2026-04-07T13:00:00Z',
    end_date: '2026-04-22T04:00:00Z',
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

/** ปุ่มกาง/ย่อรายการอีเวนต์ที่เกิน VISIBLE_EVENTS */
function ShowMoreEvents({ total, expanded, onToggle }: {
  total: number
  expanded: boolean
  onToggle: () => void
}) {
  if (total <= VISIBLE_EVENTS) return null
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-ptn-border bg-ptn-surface py-2.5 text-sm text-ptn-muted hover:text-ptn-text hover:border-ptn-red/40 transition-colors"
    >
      {expanded ? 'ย่อรายการ' : `ดูอีก ${total - VISIBLE_EVENTS} อีเวนต์`}
      <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
    </button>
  )
}

export function HomePage() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState<Stats>({ characters: 0, events: 0, posts: 0, tierLists: 0 })
  const [loading, setLoading] = useState(true)
  const [showAllActive, setShowAllActive] = useState(false)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, charsRes, postsRes, tiersRes, announcementsRes] = await Promise.all([
          supabase.from('events').select('*').eq('is_active', true).order('end_date'),
          supabase.from('characters').select('id', { count: 'exact', head: true }),
          supabase.from('forum_posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
          supabase.from('tier_lists').select('id', { count: 'exact', head: true }).eq('is_public', true),
          supabase.from('announcements').select('id, content').eq('is_active', true).order('sort_order').order('created_at'),
        ])
        setEvents(eventsRes.data && eventsRes.data.length > 0 ? eventsRes.data : DEMO_EVENTS)
        setAnnouncements(announcementsRes.data && announcementsRes.data.length > 0 ? announcementsRes.data as Announcement[] : DEMO_ANNOUNCEMENTS)
        setStats({
          characters: charsRes.count || 0,
          events: eventsRes.count || DEMO_EVENTS.length,
          posts: postsRes.count || 0,
          tierLists: tiersRes.count || 0,
        })
      } catch {
        setEvents(DEMO_EVENTS)
        setAnnouncements(DEMO_ANNOUNCEMENTS)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const now = new Date()
  const isRunning = (e: GameEvent) => new Date(e.end_date) > now && new Date(e.start_date) <= now

  // แบนเนอร์ใหญ่ = อีเวนต์ที่ติดดาวไว้ (ติดได้หลายอัน แล้วมันจะสลับให้เอง)
  // ถ้ายังไม่ได้ติดดาวไว้เลย ใช้อีเวนต์ที่กำลังดำเนินอยู่ 1 อันแทน เหมือนพฤติกรรมเดิม
  const featured = events.filter(e => e.is_featured)
  const heroEvents = featured.length > 0 ? featured : events.filter(isRunning).slice(0, 1)
  const heroIds = new Set(heroEvents.map(e => e.id))

  const activeEvents = events.filter(e => isRunning(e) && !heroIds.has(e.id))
  const upcomingEvents = events.filter(e => new Date(e.start_date) > now && !heroIds.has(e.id))

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen">
      {/* Hero — สลับอีเวนต์ที่ติดดาวไว้อัตโนมัติ */}
      <HeroCarousel events={heroEvents} />

      {/* Stats bar */}
      <section className="border-y border-ptn-border/20 bg-black/5 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'ตัวละครทั้งหมด', value: stats.characters || '40+', icon: Users, color: 'text-ptn-cyan' },
              { label: 'อีเวนต์ที่ใช้งาน', value: stats.events || activeEvents.length, icon: Calendar, color: 'text-ptn-gold' },
              { label: 'กระทู้ในฟอรัม', value: stats.posts || '0', icon: MessageSquare, color: 'text-green-400' },
              { label: 'เทียร์ลิสต์ชุมชน', value: stats.tierLists || '0', icon: BarChart3, color: 'text-ptn-purple' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={20} className={color} />
                <div>
                  <div className="font-heading text-xl font-bold text-ptn-text">{value}</div>
                  <div className="text-xs text-ptn-muted">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 grid md:grid-cols-3 gap-6">
        {/* Active Events */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-ptn-text flex items-center gap-2">
              <Calendar size={18} className="text-ptn-red" />
              อีเวนต์ที่กำลังดำเนินอยู่
            </h2>
          </div>
          <div className="space-y-2">
            {activeEvents.length === 0 && (
              <Card className="p-6 text-center text-ptn-muted">ไม่มีอีเวนต์ที่กำลังดำเนินอยู่ในขณะนี้</Card>
            )}
            {(showAllActive ? activeEvents : activeEvents.slice(0, VISIBLE_EVENTS)).map(event => (
              <EventBannerCard key={event.id} event={event} countdownTarget={event.end_date} countdownLabel="สิ้นสุดใน" />
            ))}
          </div>
          <ShowMoreEvents
            total={activeEvents.length}
            expanded={showAllActive}
            onToggle={() => setShowAllActive(v => !v)}
          />

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-8 mb-4">
                <h2 className="font-heading text-xl font-bold text-ptn-text flex items-center gap-2">
                  <Clock size={18} className="text-ptn-cyan" />
                  อีเวนต์ที่กำลังจะมา
                </h2>
              </div>
              <div className="space-y-2">
                {(showAllUpcoming ? upcomingEvents : upcomingEvents.slice(0, VISIBLE_EVENTS)).map(event => (
                  <EventBannerCard key={event.id} event={event} countdownTarget={event.start_date} countdownLabel="เริ่มใน" upcoming />
                ))}
              </div>
              <ShowMoreEvents
                total={upcomingEvents.length}
                expanded={showAllUpcoming}
                onToggle={() => setShowAllUpcoming(v => !v)}
              />
            </>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="font-heading text-xl font-bold text-ptn-text mb-4">เข้าถึงด่วน</h2>
          <div className="space-y-3">
            {[
              { to: '/characters', label: 'ฐานข้อมูลตัวละคร', desc: 'ข้อมูลตัวละครทั้งหมด', icon: Users, color: 'text-ptn-cyan' },
              { to: '/tier-lists', label: 'เทียร์ลิสต์', desc: 'จัดอันดับตัวละครโดยชุมชน', icon: BarChart3, color: 'text-ptn-gold' },
              { to: '/forum', label: 'ฟอรัมชุมชน', desc: 'พูดคุยและแชร์ข้อมูล', icon: MessageSquare, color: 'text-green-400' },
            ].map(({ to, label, desc, icon: Icon, color }) => (
              <Link key={to} to={to}>
                <Card hover className="p-4 flex items-center gap-3">
                  <Icon size={20} className={color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ptn-text text-sm">{label}</p>
                    <p className="text-xs text-ptn-muted truncate">{desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-ptn-muted shrink-0" />
                </Card>
              </Link>
            ))}
          </div>

          {/* News/Updates box */}
          <div className="mt-6 rounded-lg border border-ptn-border bg-ptn-surface p-4">
            <h3 className="font-heading text-sm font-bold text-ptn-text mb-3 flex items-center gap-2">
              <div className="h-1 w-4 bg-ptn-red rounded" />
              ข่าวสารล่าสุด
            </h3>
            <ul className="space-y-2 text-xs text-ptn-muted">
              {announcements.map(a => (
                <li key={a.id} className="flex items-start gap-2">
                  <span className="text-ptn-red shrink-0">•</span>
                  {a.content}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Event Banner Card ────────────────────────────────────────────────────────

function EventBannerCard({
  event,
  countdownTarget,
  upcoming,
}: {
  event: GameEvent
  countdownTarget: string
  countdownLabel?: string
  upcoming?: boolean
}) {
  const characterName = event.subtitle || null
  const eventName = event.title
  const [expanded, setExpanded] = useState(false)
  const [chars, setChars] = useState<CharOption[]>([])

  const { days, hours, minutes, seconds, isExpired } = useCountdown(countdownTarget)

  useEffect(() => {
    if (!expanded) return
    const ids = event.featured_character_ids
    if (!ids || ids.length === 0) return
    supabase.from('characters').select('id,name,portrait_url,slug').in('id', ids)
      .then(({ data }) => {
        if (!data) { setChars([]); return }
        const ordered = ids.map(id => data.find(c => c.id === id)).filter(Boolean) as CharOption[]
        setChars(ordered)
      })
  }, [expanded, event.id])

  const hasDetails = (event.featured_character_ids?.length ?? 0) > 0

  return (
    <div className="rounded-xl overflow-hidden border border-ptn-border">
      {/* Banner */}
      <div
        className="relative h-[160px] cursor-pointer group"
        onClick={() => hasDetails && setExpanded(v => !v)}
      >
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ objectPosition: event.image_position || '50% 50%' }}
          />
        ) : (
          <div className="absolute inset-0 bg-ptn-elevated" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-ptn-bg/85 via-ptn-bg/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ptn-bg/40 via-transparent to-transparent" />

        {/* Character name — top left */}
        {characterName && (
          <div className="absolute top-4 left-5">
            <p className="text-xs text-ptn-cyan/90 font-medium tracking-widest uppercase">{characterName}</p>
          </div>
        )}

        {/* Expand icon */}
        {hasDetails && (
          <div className="absolute top-3 right-3">
            <ChevronDown size={16} className={`text-white/60 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        )}

        {/* Bottom row */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-5 pb-4 gap-4">
          <h3 className="font-heading font-bold text-white text-2xl leading-tight drop-shadow-lg min-w-0">
            {eventName}
          </h3>
          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            <span className="text-xs text-white/80 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
              {EVENT_TYPE_LABEL[event.event_type] || event.event_type}
            </span>
            {isExpired ? (
              <span className="text-xs text-white/60">สิ้นสุดแล้ว</span>
            ) : (
              <div className="flex items-center gap-1">
                {([
                  { v: days,    th: 'วัน'  },
                  { v: hours,   th: 'ชม.'  },
                  { v: minutes, th: 'นาที' },
                  { v: seconds, th: 'วิ.'  },
                ] as const).map(({ v, th }, i, arr) => (
                  <Fragment key={th}>
                    <div
                      className="flex flex-col items-center justify-center rounded-lg"
                      style={{ background: 'rgba(80,40,140,0.85)', width: 40, height: 40, minWidth: 40 }}
                    >
                      <span className="text-sm font-bold text-white leading-none">{String(v).padStart(2, '0')}</span>
                      <span className="text-[9px] text-white/70 mt-0.5">{th}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-xs font-bold text-white/60 pb-3">:</span>
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="bg-ptn-surface border-t border-ptn-border/50">
          {/* Characters */}
          {chars.length > 0 && (
            <div className="flex justify-center gap-4 px-5 pt-4 pb-3 flex-wrap">
              {chars.map(c => {
                const eventImgs = (event.featured_character_images as Record<string, string> | null) || {}
                const imgSrc = eventImgs[c.id] || c.portrait_url
                return (
                  <Link key={c.id} to={`/characters/${c.slug}`} className="flex flex-col items-center gap-1 group">
                    {imgSrc
                      ? <img src={imgSrc} alt={c.name} className="w-16 h-16 rounded-lg object-cover object-top border border-ptn-border group-hover:border-ptn-cyan transition-colors" />
                      : <div className="w-16 h-16 rounded-lg bg-ptn-elevated border border-ptn-border group-hover:border-ptn-cyan transition-colors flex items-center justify-center text-ptn-disabled text-lg">{c.name[0]}</div>
                    }
                    <span className="text-xs text-ptn-muted group-hover:text-ptn-cyan transition-colors">{c.name}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Date range */}
          <div className="flex justify-between px-5 py-2 text-xs text-ptn-muted">
            <span>{formatDate(event.start_date, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false })}</span>
            <span>{formatDate(event.end_date, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false })}</span>
          </div>

          {/* Status bar */}
          <div className="px-5 pb-4">
            <div className="w-full bg-ptn-red text-white text-center text-sm font-semibold py-2.5 rounded-lg">
              {isExpired
                ? 'สิ้นสุดแล้ว'
                : upcoming
                ? `เริ่มในอีก ${days} วัน`
                : `สิ้นสุดในอีก ${days} วัน`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

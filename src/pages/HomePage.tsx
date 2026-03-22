import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, BarChart3, MessageSquare, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { GameEvent } from '../types'
import { EventCountdown } from '../components/events/EventCountdown'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { formatDate } from '../lib/utils'
import { PageLoader } from '../components/ui/Spinner'
import { EVENT_TYPE_LABEL } from '../lib/constants'

interface Stats {
  characters: number
  events: number
  posts: number
  tierLists: number
}

type Announcement = { id: string; content: string }

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', content: 'PTN Wiki TH เปิดให้บริการแล้ว!' },
  { id: '2', content: 'ข้อมูลตัวละครกว่า 40 ตัว ภาษาไทยครบถ้วน' },
  { id: '3', content: 'ร่วมสร้างเทียร์ลิสต์ของชุมชนได้แล้ว' },
]

// Fallback demo events — synced with s1n.gg data (as of 2026-03-22)
const DEMO_EVENTS: GameEvent[] = [
  {
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

export function HomePage() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState<Stats>({ characters: 0, events: 0, posts: 0, tierLists: 0 })
  const [loading, setLoading] = useState(true)

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
  const activeEvents = events.filter(e => new Date(e.end_date) > now && new Date(e.start_date) <= now)
  const upcomingEvents = events.filter(e => new Date(e.start_date) > now)
  const currentEvent = events.find(e => e.is_featured) || activeEvents[0]

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen">
      {/* Hero / Current Event */}
      <section className="relative overflow-hidden min-h-[340px] md:min-h-[400px] flex items-center">
        {currentEvent?.banner_url && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${currentEvent.banner_url})`,
                backgroundPosition: currentEvent.image_position || '50% 50%',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ptn-bg via-ptn-bg/85 to-ptn-bg/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-ptn-bg via-transparent to-ptn-bg/60" />
          </>
        )}
        {!currentEvent?.banner_url && <div className="absolute inset-0 bg-red-glow" />}

        <div className="relative w-full mx-auto max-w-7xl px-4 py-12 md:py-20">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-8 bg-ptn-red rounded" />
              <span className="text-xs font-medium text-ptn-red uppercase tracking-widest">
                อีเวนต์ปัจจุบัน
              </span>
            </div>
            {currentEvent ? (
              <>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-ptn-text mb-3 leading-tight drop-shadow-lg">
                  {currentEvent.title}
                </h1>
                <p className="text-ptn-muted mb-6 leading-relaxed">
                  {currentEvent.description}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <Badge variant="event" value={currentEvent.event_type} />
                  <span className="flex items-center gap-1.5 text-xs text-ptn-muted">
                    <Clock size={12} />
                    สิ้นสุด {formatDate(currentEvent.end_date)}
                  </span>
                </div>
                <EventCountdown targetDate={currentEvent.end_date} />
              </>
            ) : (
              <div>
                <h1 className="font-heading text-4xl md:text-5xl font-bold text-ptn-text mb-3">
                  PTN Wiki <span className="text-ptn-red">TH</span>
                </h1>
                <p className="text-ptn-muted text-lg">
                  แหล่งรวมข้อมูล Path to Nowhere ภาษาไทย
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-ptn-border bg-ptn-surface">
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
            {activeEvents.map(event => (
              <EventBannerCard key={event.id} event={event} countdownTarget={event.end_date} countdownLabel="สิ้นสุดใน" />
            ))}
          </div>

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
                {upcomingEvents.slice(0, 3).map(event => (
                  <EventBannerCard key={event.id} event={event} countdownTarget={event.start_date} countdownLabel="เริ่มใน" upcoming />
                ))}
              </div>
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
  countdownLabel,
}: {
  event: GameEvent
  countdownTarget: string
  countdownLabel: string
  upcoming?: boolean
}) {
  // Split "Event Name — Character Name" into parts if possible
  const parts = event.title.split(' — ')
  const eventName = parts[0]
  const characterName = parts[1] || null

  return (
    <div className="relative rounded-xl overflow-hidden border border-ptn-border group cursor-pointer h-[160px]">
      {/* Background image */}
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

      {/* Gradient: strong left fade for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-ptn-bg via-ptn-bg/80 to-ptn-bg/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-ptn-bg/50 to-transparent" />

      {/* Content pinned to bottom-left */}
      <div className="absolute inset-0 flex flex-col justify-end px-5 pb-4">
        <div className="flex items-end justify-between gap-4">
          {/* Left: text */}
          <div className="min-w-0">
            {characterName && (
              <p className="text-xs text-ptn-cyan/90 font-medium tracking-widest uppercase mb-1">{characterName}</p>
            )}
            <h3 className="font-heading font-bold text-white text-2xl leading-tight drop-shadow-lg">
              {eventName}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                {EVENT_TYPE_LABEL[event.event_type] || event.event_type}
              </span>
            </div>
          </div>

          {/* Right: countdown */}
          <div className="shrink-0 pb-0.5">
            <EventCountdown targetDate={countdownTarget} label={countdownLabel} />
          </div>
        </div>
      </div>
    </div>
  )
}

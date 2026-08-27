import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { GameEvent } from '../../types'
import { Badge } from '../ui/Badge'
import { EventCountdown } from './EventCountdown'
import { cn, formatDate } from '../../lib/utils'

/** ระยะเวลาก่อนสลับไปสไลด์ถัดไป */
const ROTATE_MS = 6000

/**
 * ผู้ใช้ขอลดการเคลื่อนไหวไว้ไหม (Windows: ตั้งค่า > การช่วยการเข้าถึง > เอฟเฟกต์ภาพ > เอฟเฟกต์ภาพเคลื่อนไหว)
 *
 * ใช้แค่ตัดสินว่าจะ "ค่อย ๆ จางสลับ" หรือ "สลับทันที" เท่านั้น — ไม่ได้ใช้ปิดการหมุน
 * เพราะค่านี้หมายถึงลดแอนิเมชัน ไม่ได้แปลว่าไม่อยากให้เนื้อหาเปลี่ยน
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * แบนเนอร์ใหญ่หน้าแรก — สลับอีเวนต์อัตโนมัติทุก 6 วินาที
 *
 * อีเวนต์ที่เข้ามาที่นี่คือตัวที่ติดดาวไว้ในหน้าแอดมิน (is_featured)
 * ถ้ายังไม่ได้ติดดาวไว้เลย HomePage จะส่งอีเวนต์ที่กำลังดำเนินอยู่มาให้ 1 อัน
 */
export function HeroCarousel({ events }: { events: GameEvent[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const count = events.length
  // หนีบค่าตอน render แทนที่จะ setState ใน effect — กันหลุด index เมื่อจำนวนอีเวนต์เปลี่ยน
  const active = count > 0 ? index % count : 0
  const current = events[active]

  useEffect(() => {
    if (count < 2 || paused) return
    // ผูก index ไว้ใน deps ด้วย เพื่อให้กดเลื่อนเองแล้วเริ่มนับเวลาใหม่ ไม่ใช่สลับทันที
    const id = setInterval(() => setIndex(i => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(id)
  }, [count, paused, index])

  const go = (next: number) => setIndex(((next % count) + count) % count)

  if (count === 0) {
    return (
      <section className="relative overflow-hidden min-h-[340px] md:min-h-[400px] flex items-center">
        <div className="absolute inset-0 bg-red-glow" />
        <div className="relative w-full mx-auto max-w-7xl px-4 py-12 md:py-20">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-ptn-text mb-3">
            PTN Wiki <span className="text-ptn-red">TH</span>
          </h1>
          <p className="text-ptn-muted text-lg">แหล่งรวมข้อมูล Path to Nowhere ภาษาไทย</p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="relative overflow-hidden min-h-[340px] md:min-h-[400px] flex items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="อีเวนต์แนะนำ"
    >
      {/* พื้นหลังทุกสไลด์ซ้อนกันไว้ แล้วค่อย ๆ จางสลับ */}
      {events.map((ev, i) => (
        <div
          key={ev.id}
          aria-hidden={i !== active}
          className={cn(
            'absolute inset-0 transition-opacity ease-in-out',
            // ขอลดการเคลื่อนไหว = สลับทันที ไม่ต้องค่อย ๆ จาง (แต่ยังสลับอยู่)
            reducedMotion ? 'duration-0' : 'duration-700',
            i === active ? 'opacity-100' : 'opacity-0',
          )}
        >
          {ev.banner_url ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(${ev.banner_url})`,
                  backgroundPosition: ev.image_position || '50% 50%',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ptn-bg/90 via-ptn-bg/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-ptn-bg/50 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-red-glow" />
          )}
        </div>
      ))}

      {/* เนื้อหาของสไลด์ที่กำลังแสดง — key ทำให้ animate ใหม่ทุกครั้งที่สลับ */}
      <div className="relative w-full mx-auto max-w-7xl px-4 py-12 md:py-20">
        <div key={current.id} className={cn('max-w-xl', !reducedMotion && 'animate-slide-up')}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1 w-8 bg-ptn-red rounded" />
            <span className="text-xs font-medium text-ptn-red uppercase tracking-widest">
              อีเวนต์ปัจจุบัน
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-ptn-text mb-3 leading-tight drop-shadow-lg">
            {current.title}
          </h1>
          {current.description && (
            <p className="text-ptn-muted mb-6 leading-relaxed">{current.description}</p>
          )}
          <div className="flex items-center gap-4 mb-6">
            <Badge variant="event" value={current.event_type} />
            <span className="flex items-center gap-1.5 text-xs text-ptn-muted">
              <Clock size={12} />
              สิ้นสุด {formatDate(current.end_date)}
            </span>
          </div>
          <EventCountdown targetDate={current.end_date} />
        </div>
      </div>

      {/* ปุ่มควบคุม — โผล่เฉพาะตอนมีมากกว่า 1 อีเวนต์ */}
      {count > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
          <button
            onClick={() => go(index - 1)}
            aria-label="อีเวนต์ก่อนหน้า"
            className="p-1.5 rounded-full bg-black/40 text-ptn-muted hover:text-ptn-text hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            {events.map((ev, i) => (
              <button
                key={ev.id}
                onClick={() => go(i)}
                aria-label={`ไปที่อีเวนต์ ${i + 1}: ${ev.title}`}
                aria-current={i === active}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === active
                    ? 'w-6 bg-ptn-red'
                    : 'w-2 bg-ptn-text/40 hover:bg-ptn-text/70',
                )}
              />
            ))}
          </div>

          <button
            onClick={() => go(index + 1)}
            aria-label="อีเวนต์ถัดไป"
            className="p-1.5 rounded-full bg-black/40 text-ptn-muted hover:text-ptn-text hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  )
}

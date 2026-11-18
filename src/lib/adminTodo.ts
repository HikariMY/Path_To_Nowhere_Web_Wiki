import { CN_STALE_DAYS } from './cnGuides'
import { MODE_ROUND_WARN_DAYS, seasonState } from './gameModes'
import { isCodeVisible } from './redeemCodes'

// ============================================================
// "งานที่ต้องทำ" บนแดชบอร์ดแอดมิน — logic ล้วน นับจากข้อมูลที่มีอยู่แล้ว ไม่มีตารางใหม่
// ============================================================

export const EVENT_SOON_DAYS = 7
const SUMMARY_MAX_NAMES = 3
const DAY_MS = 864e5

export type TodoKey = 'reports' | 'events' | 'modes' | 'sources' | 'codes'
export type TodoTone = 'red' | 'amber' | 'blue' | 'green'

export interface TodoItem {
  key: TodoKey
  label: string
  /** รายชื่อที่ต้องจัดการ หรือคำอธิบายงาน */
  detail: string
  count: number
  href: string
  tone: TodoTone
}

export interface TodoInput {
  openReports: number
  events: { title: string; end_date: string | null; is_active: boolean }[]
  modes: { name: string; in_global: boolean; season_label: string | null; season_ends: string | null }[]
  staleSources: number
  codes: { code: string; is_active: boolean; expires_at: string | null }[]
}

/** "A · B · C +2" — ไม่ให้แถวยาวเกิน */
export function summarizeNames(names: readonly string[], max = SUMMARY_MAX_NAMES): string {
  const shown = names.slice(0, max).join(' · ')
  return names.length > max ? `${shown} +${names.length - max}` : shown
}

export function buildTodos(input: TodoInput, now: Date = new Date()): TodoItem[] {
  const soonLimit = now.getTime() + EVENT_SOON_DAYS * DAY_MS
  const endingEvents = input.events.filter(e => {
    if (!e.is_active || !e.end_date) return false
    const end = new Date(e.end_date).getTime()
    return end > now.getTime() && end <= soonLimit
  })

  // เตือนเฉพาะโหมดที่มีใน Global (หน้าเว็บแสดงรอบเฉพาะโหมดเหล่านี้) — เกณฑ์เดียวกับหน้าแอดมิน → ไกด์โหมด
  const rounds = input.modes.filter(m => m.in_global && ['ended', 'ending'].includes(seasonState(m.season_ends, now).state))

  // ซ่อนจากหน้าเว็บเองแล้ว แต่ยังเปิดค้างในหน้าแอดมิน
  const expiredCodes = input.codes.filter(c => c.is_active && c.expires_at && !isCodeVisible(c, now))

  return [
    {
      key: 'reports', tone: 'red', href: '/admin/reports', count: input.openReports,
      // นับทีละรายงาน — หน้ารายงานรวมรายงานที่ชี้เป้าเดียวกันเป็นการ์ดเดียว ตัวเลขจึงอาจมากกว่าจำนวนการ์ด
      label: 'รายงานที่ยังไม่ปิด', detail: 'นับทุกรายงาน (หลายรายงานอาจเป็นเรื่องเดียวกัน) — ตรวจแล้วปิดเรื่อง',
    },
    {
      key: 'events', tone: 'amber', href: '/admin/events', count: endingEvents.length,
      label: `อีเวนต์ที่จะหมดใน ${EVENT_SOON_DAYS} วัน`,
      detail: summarizeNames(endingEvents.map(e => e.title)) || 'ไม่มี',
    },
    {
      key: 'modes', tone: 'amber', href: '/admin/modes', count: rounds.length,
      label: `รอบโหมดที่หมดหรือจะหมดใน ${MODE_ROUND_WARN_DAYS} วัน`,
      detail: summarizeNames(rounds.map(m => (m.season_label ? `${m.name} (${m.season_label})` : m.name)))
        || 'ไม่มี — อัปเดต Stage / Trait / Boss เมื่อขึ้นรอบใหม่',
    },
    {
      key: 'sources', tone: 'blue', href: '/admin/sources', count: input.staleSources,
      label: 'แหล่งอ้างอิงที่ต้องตรวจใหม่', detail: `ไม่ได้เทียบกับต้นฉบับเกิน ${CN_STALE_DAYS} วัน`,
    },
    {
      key: 'codes', tone: 'green', href: '/admin/redeem-codes', count: expiredCodes.length,
      label: 'Redeem Code ที่หมดอายุแต่ยังเปิดอยู่',
      detail: summarizeNames(expiredCodes.map(c => c.code)) || 'ไม่มี — โค้ดที่หมดอายุซ่อนจากหน้าเว็บเองอยู่แล้ว',
    },
  ]
}

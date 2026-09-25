// ============================================================
// Rate limit + ระบบรายงานเนื้อหา — logic ล้วน (คู่กับ supabase_migration_moderation.sql)
// ============================================================

export type ReportTargetType = 'forum_post' | 'forum_reply' | 'tier_list' | 'character_guide' | 'guide_comment'
export type ReportReason = 'spam' | 'harassment' | 'wrong_info' | 'inappropriate' | 'other'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

/** เหตุผลที่ให้เลือกตอนรายงาน — ค่าต้องตรงกับ check constraint ของ reports.reason */
export const REPORT_REASONS: readonly { value: ReportReason; label: string }[] = [
  { value: 'spam',          label: 'สแปม / โฆษณา' },
  { value: 'harassment',    label: 'ก่อกวน / คุกคาม' },
  { value: 'wrong_info',    label: 'ข้อมูลผิด' },
  { value: 'inappropriate', label: 'ไม่เหมาะสม' },
  { value: 'other',         label: 'อื่น ๆ' },
]

export const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  forum_post:      'กระทู้',
  forum_reply:     'คำตอบ',
  tier_list:       'เทียร์ลิสต์',
  character_guide: 'ไกด์',
  guide_comment:   'คอมเมนต์',
}

export const REPORT_DETAIL_MAX = 500

// ── หน้าแอดมิน: รวมรายงานของเนื้อหาเดียวกัน ────────────────────────

interface ReportLike {
  id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  detail: string | null
  created_at: string
}

export interface ReportGroup<R extends ReportLike = ReportLike> {
  key: string
  target_type: ReportTargetType
  target_id: string
  reports: R[]
  reasonCounts: Partial<Record<ReportReason, number>>
  latest: string
}

/** รวมรายงานตามเนื้อหา — ถูกรายงานบ่อยสุดขึ้นก่อน เท่ากันให้ล่าสุดขึ้นก่อน */
export function groupReports<R extends ReportLike>(reports: readonly R[]): ReportGroup<R>[] {
  const groups = new Map<string, ReportGroup<R>>()
  for (const r of reports) {
    const key = `${r.target_type}:${r.target_id}`
    const group = groups.get(key) ?? {
      key, target_type: r.target_type, target_id: r.target_id, reports: [], reasonCounts: {}, latest: r.created_at,
    }
    groups.set(key, {
      ...group,
      reports: [...group.reports, r],
      reasonCounts: { ...group.reasonCounts, [r.reason]: (group.reasonCounts[r.reason] ?? 0) + 1 },
      latest: r.created_at > group.latest ? r.created_at : group.latest,
    })
  }
  return [...groups.values()].sort((a, b) =>
    b.reports.length - a.reports.length || b.latest.localeCompare(a.latest))
}

/** ข้อมูลที่ต้องใช้สร้างลิงก์ไปหน้าเนื้อหา (ดึงมาพร้อมตัวอย่างเนื้อหา) */
export interface ReportTargetLinkInfo {
  id: string
  categorySlug?: string | null
  postId?: string | null
  characterSlug?: string | null
}

/** ลิงก์ไปหน้าที่แสดงเนื้อหานั้น — ไม่มีข้อมูลพอ (ถูกลบไปแล้ว) คืน null */
export function reportTargetHref(type: ReportTargetType, info: ReportTargetLinkInfo): string | null {
  switch (type) {
    case 'forum_post':
      return info.categorySlug ? `/forum/${info.categorySlug}/${info.id}` : null
    case 'forum_reply':
      return info.categorySlug && info.postId ? `/forum/${info.categorySlug}/${info.postId}` : null
    case 'tier_list':
      return `/tier-lists/${info.id}`
    case 'character_guide':
    case 'guide_comment':
      return info.characterSlug ? `/characters/${info.characterSlug}?tab=guides` : null
  }
}

interface WriteError {
  message?: string
  code?: string
}

const RATE_LIMIT = /^RATE_LIMIT:(\d+)$/
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

/** วินาทีที่ต้องรอ ถ้าเป็น error จาก trigger rate limit — ไม่ใช่คืน null */
export function rateLimitWaitSeconds(error: WriteError | null | undefined): number | null {
  const match = RATE_LIMIT.exec(error?.message ?? '')
  return match ? Number(match[1]) : null
}

/**
 * ข้อความภาษาไทยสำหรับ error ตอนบันทึกเนื้อหา
 * - โดน rate limit → บอกเวลาที่ต้องรอ
 * - ซ้ำกับของเดิม (unique) → ใช้ข้อความ duplicate ที่ส่งมา (ถ้ามี)
 * - ของที่อ้างถึงถูกลบไปแล้ว (foreign key) → ใช้ข้อความ missingParent ที่ส่งมา (ถ้ามี)
 * - อื่น ๆ → fallback ตามด้วยข้อความ error ดิบ
 */
export function describeWriteError(
  error: WriteError | null | undefined,
  fallback: string,
  { duplicate, missingParent }: { duplicate?: string; missingParent?: string } = {},
): string {
  const wait = rateLimitWaitSeconds(error)
  if (wait !== null) {
    const when = wait < 60 ? `${wait} วินาที` : `${Math.ceil(wait / 60)} นาที`
    return `โพสต์ถี่เกินไป ลองใหม่ในอีก ${when}`
  }
  if (duplicate && error?.code === UNIQUE_VIOLATION) return duplicate
  if (missingParent && error?.code === FOREIGN_KEY_VIOLATION) return missingParent
  return error?.message ? `${fallback}: ${error.message}` : fallback
}

// ============================================================
// AI moderation — logic ล้วน (ไม่แตะ Deno / network) ใช้ได้ทั้งใน Edge Function และ vitest
// ถาม TypeSafe (System One / Jev) เป็น Noul แยกทีละเรื่อง แล้วโค้ดตัดสินจาก threshold
// https://docs.typesafe.ai/api  ·  https://docs.typesafe.ai/primitives/noul
// ============================================================

export const MODERATED_TABLES = ['forum_posts', 'forum_replies', 'character_guides', 'tier_lists'] as const
export type ModeratedTable = (typeof MODERATED_TABLES)[number]

export type ReportTargetType = 'forum_post' | 'forum_reply' | 'tier_list' | 'character_guide'
export type ReportReason = 'spam' | 'harassment' | 'wrong_info' | 'inappropriate' | 'other'

export const TARGET_TYPE: Record<ModeratedTable, ReportTargetType> = {
  forum_posts:      'forum_post',
  forum_replies:    'forum_reply',
  character_guides: 'character_guide',
  tier_lists:       'tier_list',
}

/**
 * ตั้งแต่ค่านี้ขึ้นไปส่งเข้าคิวรายงานให้แอดมินดู — ไม่ลบ ไม่ซ่อนเอง
 * เนื้อหาเป็นภาษาไทย ซึ่ง TypeSafe แจ้งว่าแม่นยำน้อยกว่าภาษาอังกฤษ → ควรปรับจากผลจริงในหน้ารายงาน
 */
export const FLAG_THRESHOLD = 0.7
export const MAX_BODY_CHARS = 4000

interface AiCheck {
  key: string
  reason: ReportReason
  instructions: string
  criteria: { true: string; false: string }
}

/** หนึ่งเรื่องต่อหนึ่ง Noul (ตามคำแนะนำของ TypeSafe) — reason ต้องเป็นค่าที่ reports.reason รับได้ */
export const AI_CHECKS: readonly AiCheck[] = [
  {
    key: 'spam',
    reason: 'spam',
    instructions: 'Is the `body` or `title` spam?',
    criteria: {
      true: 'Advertising, scams, referral or selling links, promotion unrelated to the game, or meaningless repeated/gibberish text',
      false: 'A genuine post by a player, even if short, low quality, or off-topic chat',
    },
  },
  {
    key: 'harassment',
    reason: 'harassment',
    instructions: 'Does the `body` or `title` insult, threaten, or harass a real person, such as another player or a creator?',
    criteria: {
      true: 'Personal attacks, name-calling aimed at someone, threats, or encouraging others to target a person',
      false: 'Criticism of game characters, builds, tier placements or the game itself; friendly banter; strong opinions',
    },
  },
  {
    key: 'hate',
    reason: 'harassment',
    instructions: 'Does the `body` or `title` attack people for their nationality, ethnicity, religion, gender, sexual orientation, or disability?',
    criteria: {
      true: 'Slurs or demeaning statements about a group of real people',
      false: 'No attack on a protected group of real people',
    },
  },
  {
    key: 'sexual',
    reason: 'inappropriate',
    instructions: 'Does the `body` or `title` contain explicit sexual content or graphic real-world violence?',
    criteria: {
      true: 'Explicit sexual descriptions, or gore describing real people or events',
      false: 'Normal game discussion, including in-game combat, lore, character designs, and fan appreciation',
    },
  },
]

export interface ModerationContent {
  content_type: string
  title: string
  body: string
}

type Row = Record<string, unknown>

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** ยาวเกินให้เก็บต้น + ท้าย — ตัดแค่ต้นอย่างเดียว คนเขียนจะถมข้อความไว้ก่อนแล้วซ่อนของจริงไว้ท้ายได้ */
function clip(body: string): string {
  if (body.length <= MAX_BODY_CHARS) return body
  const half = Math.floor(MAX_BODY_CHARS / 2)
  return `${body.slice(0, half)}\n…\n${body.slice(-half)}`
}

export function isModeratedTable(table: string): table is ModeratedTable {
  return (MODERATED_TABLES as readonly string[]).includes(table)
}

/** ดึงข้อความที่ต้องตรวจจากแถวของแต่ละตาราง — ตัดความยาว (เก็บต้น + ท้าย) ไม่ให้คำขอใหญ่เกินจำเป็น */
export function contentForModeration(table: ModeratedTable, row: Row): ModerationContent {
  const sections = Array.isArray(row.sections) ? (row.sections as Row[]) : []
  const byTable: Record<ModeratedTable, ModerationContent> = {
    forum_posts:      { content_type: 'forum post', title: text(row.title), body: text(row.content) },
    forum_replies:    { content_type: 'forum reply', title: '', body: text(row.content) },
    character_guides: {
      content_type: 'character guide',
      title: text(row.title),
      body: sections.map(s => [text(s.heading), text(s.body)].filter(Boolean).join('\n')).join('\n\n'),
    },
    tier_lists:       { content_type: 'tier list', title: text(row.title), body: text(row.description) },
  }
  const content = byTable[table]
  return { ...content, body: clip(content.body) }
}

export interface TypeSafeRequest {
  state: Record<string, string>
  model: string
  questions: Record<string, { type: 'noul'; instructions: string; criteria: { true: string; false: string } }>
}

export function buildTypeSafeRequest(content: ModerationContent): TypeSafeRequest {
  return {
    model: 'jev-latest',
    state: {
      site: 'Project Duck — a Thai fan wiki and community for the mobile game Path to Nowhere. '
        + 'Posts are usually in Thai and use game terms (character names, Crimebrand, Shackle, Reforge, combat).',
      ...content,
    },
    questions: Object.fromEntries(
      AI_CHECKS.map(c => [c.key, { type: 'noul' as const, instructions: c.instructions, criteria: c.criteria }]),
    ),
  }
}

export interface FlagDecision {
  flagged: boolean
  /** Noul ที่คะแนนสูงสุดในบรรดาที่เกิน threshold */
  check: string | null
  reason: ReportReason | null
  scores: Record<string, number>
}

/** ติดธงเมื่อมี Noul ใดเกิน FLAG_THRESHOLD — ใช้เหตุผลของตัวที่คะแนนสูงสุด */
export function decideFlag(answers: Record<string, unknown>): FlagDecision {
  const scores: Record<string, number> = {}
  for (const check of AI_CHECKS) {
    const answer = answers[check.key] as { noul?: unknown } | undefined
    if (typeof answer?.noul === 'number') scores[check.key] = answer.noul
  }
  const top = AI_CHECKS
    .filter(c => (scores[c.key] ?? 0) >= FLAG_THRESHOLD)
    .sort((a, b) => scores[b.key] - scores[a.key])[0]
  return { flagged: Boolean(top), check: top?.key ?? null, reason: top?.reason ?? null, scores }
}

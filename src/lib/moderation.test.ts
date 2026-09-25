import { describe, expect, test } from 'vitest'
import { REPORT_REASONS, describeWriteError, groupReports, rateLimitWaitSeconds, reportTargetHref } from './moderation'

const report = (target_id: string, reason: 'spam' | 'wrong_info', created_at: string) => ({
  id: `${target_id}-${created_at}`,
  target_type: 'forum_post' as const,
  target_id,
  reason,
  detail: null,
  created_at,
})

describe('groupReports', () => {
  test('merges reports about the same content and counts reasons', () => {
    const [group] = groupReports([
      report('p1', 'spam', '2026-09-01T00:00:00Z'),
      report('p1', 'spam', '2026-09-02T00:00:00Z'),
      report('p1', 'wrong_info', '2026-09-03T00:00:00Z'),
    ])
    expect(group.reports).toHaveLength(3)
    expect(group.reasonCounts).toEqual({ spam: 2, wrong_info: 1 })
    expect(group.latest).toBe('2026-09-03T00:00:00Z')
  })

  test('puts the most-reported content first, then the most recent', () => {
    const groups = groupReports([
      report('once-old', 'spam', '2026-09-01T00:00:00Z'),
      report('twice', 'spam', '2026-09-02T00:00:00Z'),
      report('twice', 'spam', '2026-09-02T01:00:00Z'),
      report('once-new', 'spam', '2026-09-05T00:00:00Z'),
    ])
    expect(groups.map(g => g.target_id)).toEqual(['twice', 'once-new', 'once-old'])
  })

  test('keeps the same id under different content types apart', () => {
    const groups = groupReports([
      report('x', 'spam', '2026-09-01T00:00:00Z'),
      { ...report('x', 'spam', '2026-09-01T00:00:00Z'), target_type: 'tier_list' as const },
    ])
    expect(groups).toHaveLength(2)
  })
})

describe('reportTargetHref', () => {
  test('links each content type to the page that shows it', () => {
    expect(reportTargetHref('forum_post', { id: 'p1', categorySlug: 'general' })).toBe('/forum/general/p1')
    expect(reportTargetHref('forum_reply', { id: 'r1', categorySlug: 'general', postId: 'p1' })).toBe('/forum/general/p1')
    expect(reportTargetHref('tier_list', { id: 't1' })).toBe('/tier-lists/t1')
    expect(reportTargetHref('character_guide', { id: 'g1', characterSlug: 'bianca' })).toBe('/characters/bianca?tab=guides')
  })

  test('returns null when the content (or what it hangs off) is gone', () => {
    expect(reportTargetHref('forum_post', { id: 'p1' })).toBeNull()
    expect(reportTargetHref('forum_reply', { id: 'r1', categorySlug: 'general' })).toBeNull()
    expect(reportTargetHref('character_guide', { id: 'g1' })).toBeNull()
  })
})

describe('rateLimitWaitSeconds', () => {
  test('reads the wait time the rate-limit trigger puts in the message', () => {
    expect(rateLimitWaitSeconds({ message: 'RATE_LIMIT:90' })).toBe(90)
  })

  test('returns null for anything that is not a rate-limit error', () => {
    expect(rateLimitWaitSeconds({ message: 'duplicate key value' })).toBeNull()
    expect(rateLimitWaitSeconds(null)).toBeNull()
  })
})

describe('describeWriteError', () => {
  test('turns a rate limit into a Thai message with minutes rounded up', () => {
    expect(describeWriteError({ message: 'RATE_LIMIT:90' }, 'fallback')).toBe('โพสต์ถี่เกินไป ลองใหม่ในอีก 2 นาที')
    expect(describeWriteError({ message: 'RATE_LIMIT:30' }, 'fallback')).toBe('โพสต์ถี่เกินไป ลองใหม่ในอีก 30 วินาที')
  })

  test('uses the caller-supplied text for a unique-key clash, and only when given', () => {
    const dup = { code: '23505', message: 'duplicate key' }
    expect(describeWriteError(dup, 'fallback', { duplicate: 'คุณรายงานเนื้อหานี้ไปแล้ว' })).toBe('คุณรายงานเนื้อหานี้ไปแล้ว')
    expect(describeWriteError(dup, 'fallback')).toBe('fallback: duplicate key')
  })

  test('falls back to the given message plus the raw error text', () => {
    expect(describeWriteError({ message: 'boom' }, 'บันทึกไม่สำเร็จ')).toBe('บันทึกไม่สำเร็จ: boom')
    expect(describeWriteError(null, 'บันทึกไม่สำเร็จ')).toBe('บันทึกไม่สำเร็จ')
  })
})

describe('REPORT_REASONS', () => {
  test('matches the reason values the database accepts', () => {
    expect(REPORT_REASONS.map(r => r.value)).toEqual(['spam', 'harassment', 'wrong_info', 'inappropriate', 'other'])
  })
})

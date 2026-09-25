import { describe, expect, test } from 'vitest'
import { NEW_BADGE_DAYS, isNewCharacter } from './newBadge'

const char = (release_date: string | null, extra: { is_new?: boolean; is_unreleased?: boolean } = {}) => ({
  release_date,
  is_new: extra.is_new ?? false,
  is_unreleased: extra.is_unreleased ?? false,
})

// 10:00 เวลาไทย วันที่ 25 ก.ย. 2026
const NOW = new Date('2026-09-25T03:00:00Z')

describe('isNewCharacter', () => {
  test('shows NEW from the release day (Thai time) for NEW_BADGE_DAYS days', () => {
    expect(NEW_BADGE_DAYS).toBe(14)
    expect(isNewCharacter(char('2026-09-25'), NOW)).toBe(true)
    expect(isNewCharacter(char('2026-09-12'), NOW)).toBe(true)
    expect(isNewCharacter(char('2026-09-11'), NOW)).toBe(false)
  })

  test('the release day counts from midnight Thai time, not UTC', () => {
    // 00:30 เวลาไทย 26 ก.ย. = ยังเป็น 25 ก.ย. ใน UTC
    expect(isNewCharacter(char('2026-09-26'), new Date('2026-09-25T17:30:00Z'))).toBe(true)
    expect(isNewCharacter(char('2026-09-26'), new Date('2026-09-25T16:30:00Z'))).toBe(false)
  })

  test('future and unreleased characters are not new yet', () => {
    expect(isNewCharacter(char('2026-10-01'), NOW)).toBe(false)
    expect(isNewCharacter(char('2026-09-20', { is_unreleased: true }), NOW)).toBe(false)
  })

  test('the admin is_new flag always shows the badge', () => {
    expect(isNewCharacter(char(null, { is_new: true }), NOW)).toBe(true)
    expect(isNewCharacter(char('2025-01-01', { is_new: true }), NOW)).toBe(true)
  })

  test('missing or broken dates are not new', () => {
    expect(isNewCharacter(char(null), NOW)).toBe(false)
    expect(isNewCharacter(char('not-a-date'), NOW)).toBe(false)
  })
})

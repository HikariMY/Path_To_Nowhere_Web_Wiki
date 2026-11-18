import { describe, expect, it } from 'vitest'
import { formatRemaining, isCodeVisible, pickEndingEvent, validateCode, visibleCodes } from './redeemCodes'

const NOW = new Date('2026-11-18T12:00:00+07:00')

describe('validateCode', () => {
  it('trims and accepts a normal code', () => {
    expect(validateCode('  Happy4thAnniv ')).toEqual({ ok: true, code: 'Happy4thAnniv' })
  })

  it('rejects empty, spaced and too-long codes', () => {
    expect(validateCode('   ').ok).toBe(false)
    expect(validateCode('ABC DEF').ok).toBe(false)
    expect(validateCode('A'.repeat(41)).ok).toBe(false)
  })

  it('rejects a code that already exists, ignoring case', () => {
    expect(validateCode('alwaystogether', ['AlwaysTogether']).ok).toBe(false)
  })
})

describe('isCodeVisible / visibleCodes', () => {
  const code = (over: Partial<{ is_active: boolean; expires_at: string | null }>) => ({ is_active: true, expires_at: null, ...over })

  it('shows active codes without an expiry', () => {
    expect(isCodeVisible(code({}), NOW)).toBe(true)
  })

  it('hides inactive and expired codes', () => {
    expect(isCodeVisible(code({ is_active: false }), NOW)).toBe(false)
    expect(isCodeVisible(code({ expires_at: '2026-11-18T04:59:00Z' }), NOW)).toBe(false)
    expect(isCodeVisible(code({ expires_at: '2026-11-18T05:01:00Z' }), NOW)).toBe(true)
  })

  it('keeps the original order', () => {
    const list = [
      { ...code({}), code: 'A' },
      { ...code({ is_active: false }), code: 'B' },
      { ...code({}), code: 'C' },
    ]
    expect(visibleCodes(list, NOW).map(c => c.code)).toEqual(['A', 'C'])
  })
})

describe('pickEndingEvent', () => {
  const ev = (id: string, start: string | null, end: string | null) => ({ id, title: id, start_date: start, end_date: end })

  it('picks the running event that ends first', () => {
    const events = [
      ev('later', '2026-11-01T00:00:00Z', '2026-12-10T00:00:00Z'),
      ev('soon', null, '2026-11-25T00:00:00Z'),
      ev('upcoming', '2026-11-20T00:00:00Z', '2026-11-21T00:00:00Z'),
      ev('ended', '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z'),
      ev('permanent', '2026-01-01T00:00:00Z', null),
    ]
    expect(pickEndingEvent(events, NOW)?.id).toBe('soon')
  })

  it('returns null when nothing has an end date', () => {
    expect(pickEndingEvent([ev('permanent', null, null)], NOW)).toBeNull()
  })
})

describe('formatRemaining', () => {
  const H = 3_600_000
  it('uses days and hours when more than a day is left', () => {
    expect(formatRemaining(3 * 24 * H + 5 * H + 59_000)).toBe('3 วัน 5 ชม.')
  })

  it('uses hours and minutes, then minutes', () => {
    expect(formatRemaining(2 * H + 30 * 60_000)).toBe('2 ชม. 30 นาที')
    expect(formatRemaining(45 * 60_000)).toBe('45 นาที')
    expect(formatRemaining(-1)).toBe('0 นาที')
  })
})

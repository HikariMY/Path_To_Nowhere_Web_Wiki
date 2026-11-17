import { describe, expect, test } from 'vitest'
import {
  MODE_ROUND_WARN_DAYS, modeStatus, parseLines, parseStages, readShots, readStages, readStrings, seasonState, validateMode,
} from './gameModes'

describe('readStrings / parseLines', () => {
  test('readStrings keeps non-empty strings only', () => {
    expect(readStrings(['a', 3, '', '  b ', null])).toEqual(['a', '  b '])
    expect(readStrings('x')).toEqual([])
  })

  test('parseLines trims and drops blank lines', () => {
    expect(parseLines(' Misfortune Incarnate \n\nModel Divine Punishment\n')).toEqual(['Misfortune Incarnate', 'Model Divine Punishment'])
  })
})

describe('stages', () => {
  test('readStages keeps a name with an optional detail', () => {
    expect(readStages([{ title: 'EX1-1S', body: '' }, { title: '01 Limbo Resonance', body: '1,000 m' }, { body: 'x' }, 3])).toEqual([
      { title: 'EX1-1S', body: '' },
      { title: '01 Limbo Resonance', body: '1,000 m' },
    ])
  })

  test('parseStages reads "name: detail" lines, detail is optional', () => {
    expect(parseStages('01 Limbo Resonance: 1,000 m\nEX1-2')).toEqual([
      { title: '01 Limbo Resonance', body: '1,000 m' },
      { title: 'EX1-2', body: '' },
    ])
  })
})

describe('readShots', () => {
  test('keeps images with an http(s) url and a caption', () => {
    expect(readShots([
      { url: 'https://x.supabase.co/storage/v1/object/public/events/a.jpg', caption: 'Oblivion Pit' },
      { url: 'javascript:alert(1)', caption: 'bad' },
      { url: 'https://ok.example/b.png' },
      'nope',
    ])).toEqual([
      { url: 'https://x.supabase.co/storage/v1/object/public/events/a.jpg', caption: 'Oblivion Pit' },
      { url: 'https://ok.example/b.png', caption: '' },
    ])
  })
})

describe('modeStatus', () => {
  test('a mode in Global with a checked name', () => {
    expect(modeStatus({ in_global: true, verified: true, locked: false })).toEqual({ key: 'global', label: 'Global', locked: false })
  })
  test('a Global mode whose name is not checked yet', () => {
    expect(modeStatus({ in_global: true, verified: false, locked: false }).key).toBe('unverified')
  })
  test('a mode not found in Global', () => {
    expect(modeStatus({ in_global: false, verified: false, locked: false })).toEqual({ key: 'cn-only', label: 'ยังไม่พบใน Global', locked: false })
  })
  test('locked is reported separately', () => {
    expect(modeStatus({ in_global: true, verified: true, locked: true }).locked).toBe(true)
  })
})

describe('seasonState', () => {
  const now = new Date('2026-11-17T12:00:00+07:00')
  test('no end date', () => {
    expect(seasonState(null, now)).toEqual({ state: 'none', daysLeft: null })
  })
  test('ended', () => {
    expect(seasonState('2026-11-01T05:00:00+07:00', now).state).toBe('ended')
  })
  test(`ending within ${MODE_ROUND_WARN_DAYS} days`, () => {
    expect(seasonState('2026-12-08T04:59:59+07:00', now)).toEqual({ state: 'ending', daysLeft: 21 })
  })
  test('running', () => {
    expect(seasonState('2027-01-30T05:00:00+07:00', now).state).toBe('running')
  })
  test('a broken date counts as none', () => {
    expect(seasonState('not a date', now).state).toBe('none')
  })
})

describe('validateMode', () => {
  const ok = { name: 'Dark Area', slug: 'dark-domain', summary: 'x' }
  test('a minimal valid mode', () => {
    expect(validateMode(ok)).toEqual([])
  })
  test('name and slug are required, slug is lowercase letters, numbers and dashes', () => {
    expect(validateMode({ ...ok, name: ' ', slug: 'Dark Area' })).toEqual(['ใส่ชื่อโหมด', 'slug ใช้ได้แค่ a-z 0-9 และ - เช่น dark-area'])
  })
})

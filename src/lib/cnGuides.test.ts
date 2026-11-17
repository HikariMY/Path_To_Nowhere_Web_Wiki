import { describe, expect, test } from 'vitest'
import {
  CN_POINTS_MAX, CN_VERDICT_MAX, isStale, parsePoints, pointsToText, readPoints, validateCnGuide,
} from './cnGuides'

describe('parsePoints', () => {
  test('reads "title: body" lines and skips blank ones', () => {
    expect(parsePoints('บทบาท: DPS สาย Long Fight\n\n จุดเด่น : Crit สูง ')).toEqual([
      { title: 'บทบาท', body: 'DPS สาย Long Fight' },
      { title: 'จุดเด่น', body: 'Crit สูง' },
    ])
  })

  test('a line without a colon becomes a point with no title', () => {
    expect(parsePoints('เล่นยาก')).toEqual([{ title: '', body: 'เล่นยาก' }])
  })

  test('only the first colon splits, so times like 05:00 stay in the body', () => {
    expect(parsePoints('รีเซ็ต: ทุกวันจันทร์ 05:00')).toEqual([{ title: 'รีเซ็ต', body: 'ทุกวันจันทร์ 05:00' }])
  })

  test('keeps at most CN_POINTS_MAX points', () => {
    const text = Array.from({ length: CN_POINTS_MAX + 3 }, (_, i) => `ข้อ ${i}: x`).join('\n')
    expect(parsePoints(text)).toHaveLength(CN_POINTS_MAX)
  })

  test('pointsToText is the reverse of parsePoints', () => {
    const points = [{ title: 'บทบาท', body: 'DPS' }, { title: '', body: 'เล่นยาก' }]
    expect(parsePoints(pointsToText(points))).toEqual(points)
  })
})

describe('readPoints', () => {
  test('drops entries of the wrong shape', () => {
    expect(readPoints([{ title: 'a', body: 'b' }, { title: 1 }, 'x', null, { body: 'c' }])).toEqual([
      { title: 'a', body: 'b' },
      { title: '', body: 'c' },
    ])
    expect(readPoints('nope')).toEqual([])
  })
})

describe('validateCnGuide', () => {
  const ok = { verdict: 'ไม่ค่อยคุ้มสุ่ม', pointsText: 'บทบาท: DPS', source_title: '承霄角色简评', source_author: '白色茵雨', source_url: 'https://wiki.biligame.com/wqmt/x' }

  test('a complete guide has no errors', () => {
    expect(validateCnGuide(ok)).toEqual([])
  })

  test('needs a credit and at least one point', () => {
    const errors = validateCnGuide({ ...ok, pointsText: '  ', source_author: '', source_url: 'javascript:alert(1)' })
    expect(errors).toEqual(['ใส่ประเด็นอย่างน้อย 1 ข้อ', 'ใส่ชื่อผู้เขียนต้นฉบับ', 'ลิงก์ต้นฉบับต้องขึ้นต้นด้วย https://'])
  })

  test('verdict has a length limit', () => {
    expect(validateCnGuide({ ...ok, verdict: 'x'.repeat(CN_VERDICT_MAX + 1) })).toEqual([`สรุปสั้นยาวเกิน ${CN_VERDICT_MAX} ตัวอักษร`])
  })
})

describe('isStale', () => {
  const now = new Date('2026-11-17T12:00:00+07:00')
  test('older than 60 days needs a recheck', () => {
    expect(isStale('2026-09-01', now)).toBe(true)
    expect(isStale('2026-10-20', now)).toBe(false)
  })
  test('a missing or broken date counts as stale', () => {
    expect(isStale(null, now)).toBe(true)
    expect(isStale('not a date', now)).toBe(true)
  })
})

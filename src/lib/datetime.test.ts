import { describe, expect, test } from 'vitest'
import { fromDateTimeInput, toDateTimeInput } from './datetime'

describe('toDateTimeInput', () => {
  test('shows a stored UTC timestamp in local time, not as the raw UTC digits', () => {
    // 8 ต.ค. 15:00 ตามเวลาเครื่อง — ไม่ว่าเครื่องจะอยู่ timezone ไหน
    const stored = new Date(2026, 9, 8, 15, 0).toISOString()
    expect(toDateTimeInput(stored)).toBe('2026-10-08T15:00')
  })

  test('accepts the +00:00 form Supabase returns for timestamptz', () => {
    const local = new Date(2026, 9, 8, 15, 0)
    const supabaseForm = local.toISOString().replace('.000Z', '+00:00')
    expect(toDateTimeInput(supabaseForm)).toBe('2026-10-08T15:00')
  })

  test('returns an empty string for missing or invalid values', () => {
    expect(toDateTimeInput(null)).toBe('')
    expect(toDateTimeInput(undefined)).toBe('')
    expect(toDateTimeInput('not a date')).toBe('')
  })
})

describe('fromDateTimeInput', () => {
  test('reads the input as local time and stores UTC', () => {
    expect(fromDateTimeInput('2026-10-08T15:00')).toBe(new Date(2026, 9, 8, 15, 0).toISOString())
  })

  test('returns null for an empty or invalid input', () => {
    expect(fromDateTimeInput('')).toBeNull()
    expect(fromDateTimeInput('garbage')).toBeNull()
  })

  test('editing and saving without changes keeps the same instant', () => {
    const stored = new Date(2026, 9, 8, 15, 0).toISOString()
    let value = stored
    for (let i = 0; i < 3; i++) value = fromDateTimeInput(toDateTimeInput(value))!
    expect(value).toBe(stored)
  })
})

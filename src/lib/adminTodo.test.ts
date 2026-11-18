import { describe, expect, it } from 'vitest'
import { buildTodos, summarizeNames, type TodoInput } from './adminTodo'

const NOW = new Date('2026-11-18T12:00:00Z')
const days = (n: number) => new Date(NOW.getTime() + n * 864e5).toISOString()

const empty: TodoInput = { openReports: 0, events: [], modes: [], staleSources: 0, codes: [] }
const byKey = (input: TodoInput) => Object.fromEntries(buildTodos(input, NOW).map(t => [t.key, t]))

describe('summarizeNames', () => {
  it('joins up to three names and counts the rest', () => {
    expect(summarizeNames(['A', 'B'])).toBe('A · B')
    expect(summarizeNames(['A', 'B', 'C', 'D', 'E'])).toBe('A · B · C +2')
  })
})

describe('buildTodos', () => {
  it('lists every task even when there is nothing to do', () => {
    const todos = buildTodos(empty, NOW)
    expect(todos.map(t => t.key)).toEqual(['reports', 'events', 'modes', 'sources', 'codes'])
    expect(todos.every(t => t.count === 0)).toBe(true)
  })

  it('counts open reports and stale sources as given', () => {
    const t = byKey({ ...empty, openReports: 3, staleSources: 2 })
    expect(t.reports.count).toBe(3)
    expect(t.sources.count).toBe(2)
  })

  it('counts active events that end within 7 days', () => {
    const t = byKey({
      ...empty,
      events: [
        { title: 'Soon', end_date: days(2), is_active: true },
        { title: 'Edge', end_date: days(7), is_active: true },
        { title: 'Later', end_date: days(8), is_active: true },
        { title: 'Ended', end_date: days(-1), is_active: true },
        { title: 'Hidden', end_date: days(1), is_active: false },
        { title: 'Permanent', end_date: null, is_active: true },
      ],
    })
    expect(t.events.count).toBe(2)
    expect(t.events.detail).toBe('Soon · Edge')
  })

  it('counts Global mode rounds that ended or end within 30 days', () => {
    const t = byKey({
      ...empty,
      modes: [
        { name: 'Ending', in_global: true, season_label: 'S3', season_ends: days(10) },
        { name: 'Ended', in_global: true, season_label: 'S2', season_ends: days(-3) },
        { name: 'Running', in_global: true, season_label: 'S1', season_ends: days(60) },
        { name: 'CN only', in_global: false, season_label: 'S9', season_ends: days(1) },
        { name: 'No round', in_global: true, season_label: null, season_ends: null },
      ],
    })
    expect(t.modes.count).toBe(2)
    expect(t.modes.detail).toBe('Ending (S3) · Ended (S2)')
  })

  it('counts codes that expired but are still switched on', () => {
    const t = byKey({
      ...empty,
      codes: [
        { code: 'OLD', is_active: true, expires_at: days(-1) },
        { code: 'OFF', is_active: false, expires_at: days(-1) },
        { code: 'OK', is_active: true, expires_at: days(5) },
        { code: 'FOREVER', is_active: true, expires_at: null },
      ],
    })
    expect(t.codes.count).toBe(1)
    expect(t.codes.detail).toBe('OLD')
  })
})

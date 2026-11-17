import { describe, expect, test } from 'vitest'
import type { TierRow } from '../types/models'
import {
  CHAR_NOTE_MAX,
  TIER_NOTE_MAX,
  buildMetaPayload,
  charsInColumn,
  clampColumns,
  findPlacement,
  normalizeTiersForSave,
  parseRoleColumns,
  placeCharacter,
  readTierListMeta,
  safeHttpUrl,
  setTierNote,
  toggleCharMark,
  updateCharDetail,
} from './tierList'
import { TIER_MARKS, isTierMarkKey } from './tierMarks'

const tier = (label: string, ids: string[] = [], extra: Partial<TierRow> = {}): TierRow =>
  ({ label, color: '#fff', character_ids: ids, ...extra })

describe('placeCharacter with details', () => {
  test('keeps marks and note when a character moves to another tier', () => {
    const start = [tier('S', ['a'], { details: { a: { marks: ['limited'], note: 'hi' } } }), tier('A')]
    const next = placeCharacter(start, 'a', 1)
    expect(next[0].details?.a).toBeUndefined()
    expect(next[1].details?.a).toEqual({ marks: ['limited'], note: 'hi' })
    expect(start[0].details?.a).toEqual({ marks: ['limited'], note: 'hi' })
  })

  test('sets the column when one is given', () => {
    const next = placeCharacter([tier('S'), tier('A')], 'a', 0, 1)
    expect(next[0].character_ids).toEqual(['a'])
    expect(next[0].details?.a?.col).toBe(1)
  })

  test('moving inside the same tier only changes the column', () => {
    const start = [tier('S', ['a', 'b'], { details: { a: { note: 'x' } } })]
    const next = placeCharacter(start, 'a', 0, 1)
    expect(next[0].character_ids).toEqual(['b', 'a'])
    expect(next[0].details?.a).toEqual({ note: 'x', col: 1 })
  })

  test('removing a character drops its details', () => {
    const next = placeCharacter([tier('S', ['a'], { details: { a: { note: 'x' } } })], 'a', -1)
    expect(next[0].character_ids).toEqual([])
    expect(next[0].details?.a).toBeUndefined()
  })
})

describe('character details', () => {
  const tiers = () => [tier('S', ['a']), tier('A', ['b'], { details: { b: { marks: ['budget'] } } })]

  test('findPlacement returns the tier and detail of a character', () => {
    expect(findPlacement(tiers(), 'b')).toEqual({ tierIndex: 1, detail: { marks: ['budget'] } })
    expect(findPlacement(tiers(), 'a')).toEqual({ tierIndex: 0, detail: {} })
    expect(findPlacement(tiers(), 'zz')).toBeNull()
  })

  test('updateCharDetail merges into the right tier and cuts long notes', () => {
    const next = updateCharDetail(tiers(), 'b', { note: 'x'.repeat(CHAR_NOTE_MAX + 50) })
    expect(next[1].details?.b?.marks).toEqual(['budget'])
    expect(next[1].details?.b?.note).toHaveLength(CHAR_NOTE_MAX)
  })

  test('updateCharDetail ignores characters that are not placed', () => {
    expect(updateCharDetail(tiers(), 'zz', { note: 'x' })).toEqual(tiers())
  })

  test('toggleCharMark adds and removes a mark', () => {
    const once = toggleCharMark(tiers(), 'a', 'limited')
    expect(once[0].details?.a?.marks).toEqual(['limited'])
    const twice = toggleCharMark(once, 'a', 'limited')
    expect(twice[0].details?.a?.marks).toEqual([])
  })

  test('setTierNote cuts long notes', () => {
    const next = setTierNote(tiers(), 0, 'y'.repeat(TIER_NOTE_MAX + 5))
    expect(next[0].note).toHaveLength(TIER_NOTE_MAX)
  })
})

describe('role columns', () => {
  test('parseRoleColumns trims, drops blanks and duplicates, keeps at most 4', () => {
    expect(parseRoleColumns(' Damage, Support ,,Damage')).toEqual(['Damage', 'Support'])
    expect(parseRoleColumns('a,b,c,d,e')).toEqual(['a', 'b', 'c', 'd'])
  })

  test('a single column means no columns', () => {
    expect(parseRoleColumns('Damage')).toEqual([])
    expect(parseRoleColumns('')).toEqual([])
  })

  test('charsInColumn splits a tier by column, out-of-range columns fall into the last one', () => {
    const row = tier('S', ['a', 'b', 'c'], { details: { b: { col: 1 }, c: { col: 7 } } })
    expect(charsInColumn(row, 0, 2)).toEqual(['a'])
    expect(charsInColumn(row, 1, 2)).toEqual(['b', 'c'])
    expect(charsInColumn(row, 0, 0)).toEqual(['a', 'b', 'c'])
  })

  test('clampColumns pulls characters back into the remaining columns', () => {
    const next = clampColumns([tier('S', ['a'], { details: { a: { col: 3 } } })], 2)
    expect(next[0].details?.a?.col).toBe(1)
  })
})

describe('normalizeTiersForSave with details', () => {
  test('drops details of characters no longer in the tier and empty entries', () => {
    const [row] = normalizeTiersForSave([
      tier(' S ', ['a', 'b'], { note: '  ', details: { a: { note: ' keep ', marks: [] }, b: { marks: [], note: '' }, gone: { note: 'x' } } }),
    ])
    expect(row.label).toBe('S')
    expect(row.note).toBeUndefined()
    expect(row.details).toEqual({ a: { note: 'keep' } })
  })

  test('a tier without details stays in the old shape', () => {
    expect(normalizeTiersForSave([tier('S', ['a'])])).toEqual([{ label: 'S', color: '#fff', character_ids: ['a'] }])
  })
})

describe('tier list metadata', () => {
  test('rows saved before the migration read as defaults', () => {
    expect(readTierListMeta({})).toEqual({ server: 'global', roleColumns: [], legend: [], source: null, isArchived: false })
  })

  test('unknown values are dropped', () => {
    const meta = readTierListMeta({
      server: 'jp', role_columns: ['Damage', 3, 'Support'], legend: ['limited', 'bogus'],
      source: { title: 'T', author: 'A', url: 'javascript:alert(1)' }, is_archived: true,
    })
    expect(meta).toEqual({ server: 'global', roleColumns: ['Damage', 'Support'], legend: ['limited'], source: null, isArchived: true })
  })

  test('a valid source is kept', () => {
    const source = { title: 'T', author: 'A', url: 'https://wiki.example/x', original_url: 'https://b.example', date: '2026-08-07' }
    expect(readTierListMeta({ server: 'cn', source }).source).toEqual(source)
  })

  test('buildMetaPayload leaves default fields out so saving works before the migration', () => {
    const defaults = readTierListMeta({})
    expect(buildMetaPayload(defaults, defaults)).toEqual({})
  })

  test('buildMetaPayload sends fields that are set or were set before', () => {
    const before = readTierListMeta({ role_columns: ['Damage', 'Support'] })
    const after = { ...readTierListMeta({}), server: 'cn' as const }
    expect(buildMetaPayload(after, before)).toEqual({ server: 'cn', role_columns: [] })
  })

  test('safeHttpUrl only allows http(s) links', () => {
    expect(safeHttpUrl('https://wiki.biligame.com/wqmt/x')).toBe('https://wiki.biligame.com/wqmt/x')
    expect(safeHttpUrl(' javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('not a url')).toBeNull()
    expect(safeHttpUrl(undefined)).toBeNull()
  })
})

describe('tier marks', () => {
  test('every mark has a short letter, label and meaning', () => {
    for (const m of TIER_MARKS) {
      expect(m.short).toHaveLength(1)
      expect(m.label.length).toBeGreaterThan(0)
      expect(m.th.length).toBeGreaterThan(0)
    }
  })

  test('isTierMarkKey', () => {
    expect(isTierMarkKey('limited')).toBe(true)
    expect(isTierMarkKey('nope')).toBe(false)
    expect(isTierMarkKey(3)).toBe(false)
  })
})

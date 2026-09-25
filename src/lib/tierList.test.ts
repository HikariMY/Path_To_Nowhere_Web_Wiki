import { describe, expect, test } from 'vitest'
import type { TierRow } from '../types/models'
import {
  MAX_TIERS,
  TIER_LABEL_MAX,
  addTier,
  filterCharacters,
  moveTier,
  normalizeTiersForSave,
  placeCharacter,
  recolorTier,
  removeTier,
  renameTier,
  unassignedIds,
} from './tierList'

const tier = (label: string, ids: string[] = []): TierRow => ({ label, color: '#fff', character_ids: ids })
const base = (): TierRow[] => [tier('SS', ['a']), tier('S', ['b']), tier('A')]

describe('placeCharacter', () => {
  test('moves a character into a tier and out of any other', () => {
    const start = base()
    const next = placeCharacter(start, 'a', 2)
    expect(next.map(t => t.character_ids)).toEqual([[], ['b'], ['a']])
    expect(start[0].character_ids).toEqual(['a'])
  })

  test('index -1 takes the character out of every tier', () => {
    expect(placeCharacter(base(), 'b', -1).map(t => t.character_ids)).toEqual([['a'], [], []])
  })

  test('placing into the same tier again does not duplicate it', () => {
    expect(placeCharacter(base(), 'a', 0)[0].character_ids).toEqual(['a'])
  })
})

describe('unassignedIds', () => {
  test('lists characters in no tier, keeping the given order', () => {
    expect(unassignedIds(['a', 'b', 'c', 'd'], base())).toEqual(['c', 'd'])
  })
})

describe('tier rows', () => {
  test('renameTier cuts labels at the maximum length', () => {
    const long = 'x'.repeat(TIER_LABEL_MAX + 5)
    expect(renameTier(base(), 1, long)[1].label).toHaveLength(TIER_LABEL_MAX)
    expect(renameTier(base(), 1, 'ตัวหลัก')[1].label).toBe('ตัวหลัก')
  })

  test('recolorTier changes only that row', () => {
    const next = recolorTier(base(), 2, '#123456')
    expect(next.map(t => t.color)).toEqual(['#fff', '#fff', '#123456'])
  })

  test('addTier appends an empty row up to the maximum', () => {
    const next = addTier(base())
    expect(next).toHaveLength(4)
    expect(next[3].character_ids).toEqual([])
    const full = Array.from({ length: MAX_TIERS }, (_, i) => tier(String(i)))
    expect(addTier(full)).toHaveLength(MAX_TIERS)
  })

  test('removeTier drops the row, which leaves its characters unassigned', () => {
    const next = removeTier(base(), 0)
    expect(next.map(t => t.label)).toEqual(['S', 'A'])
    expect(unassignedIds(['a', 'b'], next)).toEqual(['a'])
  })

  test('removeTier keeps at least one row', () => {
    expect(removeTier([tier('SS')], 0)).toHaveLength(1)
  })

  test('moveTier swaps with its neighbour and ignores moves off the ends', () => {
    expect(moveTier(base(), 1, -1).map(t => t.label)).toEqual(['S', 'SS', 'A'])
    expect(moveTier(base(), 2, 1).map(t => t.label)).toEqual(['SS', 'S', 'A'])
  })
})

describe('normalizeTiersForSave', () => {
  test('trims labels and gives empty ones a placeholder', () => {
    const next = normalizeTiersForSave([tier('  S  '), tier('   ')])
    expect(next.map(t => t.label)).toEqual(['S', '?'])
  })
})

describe('filterCharacters', () => {
  const chars = [
    { id: '1', name: 'Siglinde', rarity: 'S', job_class: 'guard' },
    { id: '2', name: 'Augustus', rarity: 'S', job_class: 'reticle' },
    { id: '3', name: 'Ceto', rarity: 'A', job_class: 'breaker' },
  ]

  test('matches names case-insensitively', () => {
    expect(filterCharacters(chars, { query: 'aug' }).map(c => c.id)).toEqual(['2'])
  })

  test('combines rarity and class filters', () => {
    expect(filterCharacters(chars, { rarity: 'S' }).map(c => c.id)).toEqual(['1', '2'])
    expect(filterCharacters(chars, { rarity: 'S', jobClass: 'guard' }).map(c => c.id)).toEqual(['1'])
  })

  test('returns everything when no filter is set', () => {
    expect(filterCharacters(chars, {})).toHaveLength(3)
  })
})

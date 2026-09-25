import { describe, expect, test } from 'vitest'
import { DATA_CHECKS, findDataGaps, type GapCharacter } from './dataGaps'

const complete = (overrides: Partial<GapCharacter> = {}): GapCharacter => ({
  id: 'c1',
  slug: 'bianca',
  name: 'Bianca',
  portrait_url: 'https://img/bianca.png',
  overview: 'Tank ที่ดีที่สุด',
  release_date: '2024-01-01',
  stats: { health: { min: '1000', max: '5000' } },
  skills: [{ name: 'Slash' }],
  shackles: [{ level: 1 }],
  ability_tags: ['Tank'],
  is_unreleased: false,
  release_order: 10,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const buildsFor = (...ids: string[]) => new Map(ids.map(id => [id, 1]))

describe('findDataGaps', () => {
  test('a fully filled character has no gaps', () => {
    expect(findDataGaps([complete()], buildsFor('c1'))).toEqual([])
  })

  test('lists every missing field by key', () => {
    const bare = complete({
      portrait_url: null,
      overview: '   ',
      release_date: null,
      stats: { health: { min: '', max: '' } },
      skills: [],
      shackles: null,
      ability_tags: [],
    })
    const [gap] = findDataGaps([bare], new Map())
    expect(gap.missing).toEqual(DATA_CHECKS.map(c => c.key))
  })

  test('skips unreleased characters', () => {
    expect(findDataGaps([complete({ is_unreleased: true, portrait_url: null })], new Map())).toEqual([])
  })

  test('puts the newest characters first', () => {
    const gaps = findDataGaps(
      [
        complete({ id: 'old', slug: 'old', release_order: 1, skills: [] }),
        complete({ id: 'new', slug: 'new', release_order: 99, skills: [] }),
      ],
      buildsFor('old', 'new'),
    )
    expect(gaps.map(g => g.character.slug)).toEqual(['new', 'old'])
  })

  test('characters without a release order yet (just added) come first, newest created first', () => {
    const gaps = findDataGaps(
      [
        complete({ id: 'ordered', slug: 'ordered', release_order: 145, skills: [] }),
        complete({ id: 'zero', slug: 'zero', release_order: 0, created_at: '2026-09-01T00:00:00Z', skills: [] }),
        complete({ id: 'null', slug: 'null', release_order: null, created_at: '2026-09-20T00:00:00Z', skills: [] }),
      ],
      buildsFor('ordered', 'zero', 'null'),
    )
    expect(gaps.map(g => g.character.slug)).toEqual(['null', 'zero', 'ordered'])
  })

  test('treats non-array JSON as missing instead of crashing', () => {
    const [gap] = findDataGaps([complete({ skills: { broken: true }, stats: null })], buildsFor('c1'))
    expect(gap.missing).toEqual(['stats', 'skills'])
  })
})

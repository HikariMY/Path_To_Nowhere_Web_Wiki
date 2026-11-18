import { describe, expect, it } from 'vitest'
import { groupResults, matchScore, searchItems, type SearchItem } from './quickSearch'

const item = (label: string, kind: SearchItem['kind'] = 'character', sub?: string): SearchItem =>
  ({ kind, label, sub, href: `/${label}` })

describe('matchScore', () => {
  it('ranks exact, prefix, word start, then contains', () => {
    expect(matchScore('hitomi', 'Hitomi')).toBe(0)
    expect(matchScore('hit', 'Hitomi')).toBe(1)
    expect(matchScore('hit', 'Kisugi Hitomi')).toBe(2)
    expect(matchScore('tom', 'Kisugi Hitomi')).toBe(3)
    expect(matchScore('xyz', 'Kisugi Hitomi')).toBeNull()
  })

  it('ignores case, spaces and punctuation in the query', () => {
    expect(matchScore('kisugihitomi', 'Kisugi Hitomi')).toBe(0)
    expect(matchScore('  HITOMI ', 'Kisugi Hitomi')).toBe(2)
  })

  it('matches Thai labels by substring', () => {
    expect(matchScore('ฟอรัม', 'ฟอรัม')).toBe(0)
    expect(matchScore('โหมด', 'ไกด์โหมด')).toBe(3)
  })
})

describe('searchItems', () => {
  const items = [item('Kisugi Hitomi'), item('Hitomi'), item('Chief'), item('Tier', 'page', 'เทียร์ลิสต์')]

  it('returns nothing for an empty query', () => {
    expect(searchItems(items, '   ')).toEqual([])
  })

  it('sorts by match quality and keeps ties in input order', () => {
    expect(searchItems(items, 'hito').map(r => r.label)).toEqual(['Hitomi', 'Kisugi Hitomi'])
  })

  it('also matches the sub label', () => {
    expect(searchItems(items, 'เทียร์').map(r => r.label)).toEqual(['Tier'])
  })

  it('caps the number of results', () => {
    const many = Array.from({ length: 40 }, (_, i) => item(`Alpha ${i}`))
    expect(searchItems(many, 'alpha', 10)).toHaveLength(10)
  })
})

describe('groupResults', () => {
  it('groups by kind in a fixed order', () => {
    const groups = groupResults([item('A', 'mode'), item('B', 'page'), item('C', 'character'), item('D', 'page')])
    expect(groups.map(g => [g.kind, g.items.map(i => i.label)])).toEqual([
      ['page', ['B', 'D']],
      ['character', ['C']],
      ['mode', ['A']],
    ])
  })
})

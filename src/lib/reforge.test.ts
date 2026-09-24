import { describe, expect, test } from 'vitest'
import type { ReforgeData, ReforgeNode } from '../types/models'
import {
  activateAll,
  costCap,
  decodeBuild,
  eligibleExAnchors,
  encodeBuild,
  isOverCap,
  newReforgeId,
  parseGuideBuild,
  parseReforge,
  toGuideBuild,
  sumStats,
  toggleNode,
  totalCost,
  validateReforge,
} from './reforge'

const node = (over: Partial<ReforgeNode> & Pick<ReforgeNode, 'id'>): ReforgeNode => ({
  name: over.id,
  category: 'attribute',
  cost: 1,
  stage: 1,
  row: 'top',
  col: 1,
  ...over,
})

// โครงย่อของ Coquelic จากภาพในเกม
const data: ReforgeData = {
  cost_base: 21,
  cost_bonus: 5,
  nodes: [
    node({ id: 'hp', cost: 1, stats: [{ label: 'HP', value: 4.5, unit: 'percent' }] }),
    node({ id: 'atk', cost: 1, row: 'bottom', stats: [{ label: 'Attack', value: 4.5, unit: 'percent' }] }),
    node({ id: 'sword', category: 'special', cost: 3, row: 'bottom', col: 2 }),
    node({ id: 'dance', category: 'special', cost: 5, stage: 2, row: 'bottom', col: 2, choice_group: 'ult' }),
    node({ id: 'river', category: 'special', cost: 5, stage: 2, row: 'bottom', col: 2, choice_group: 'ult' }),
    node({ id: 'glow', category: 'special', cost: 3, stage: 4, row: 'bottom', col: 2, choice_group: 'bloom' }),
    node({ id: 'momentum', category: 'special', cost: 3, stage: 4, row: 'bottom', col: 2, choice_group: 'bloom' }),
  ],
  effects: [
    { id: 'e1', stage: 1, type: 'intensify', stats: [{ label: 'HP', value: 250, unit: 'flat' }, { label: 'Attack', value: 25, unit: 'flat' }] },
    { id: 'e2', stage: 2, type: 'leap', stats: [] },
    { id: 'e3', stage: 2, type: 'intensify', stats: [{ label: 'Attack', value: 25, unit: 'flat' }] },
  ],
  presets: [{ id: 'p1', name: 'แนะนำ', node_ids: ['atk', 'sword', 'river'] }],
}

describe('costCap / totalCost / isOverCap', () => {
  test('cap is base plus bonus', () => {
    expect(costCap(data)).toBe(26)
  })

  test('sums cost of active nodes and ignores unknown ids', () => {
    expect(totalCost(data, ['atk', 'sword', 'river', 'ghost'])).toBe(9)
  })

  test('flags builds above the cap without blocking them', () => {
    const tight = { ...data, cost_base: 5, cost_bonus: 0 }
    expect(isOverCap(tight, ['sword', 'river'])).toBe(true)
    expect(isOverCap(tight, ['atk', 'sword'])).toBe(false)
  })
})

describe('toggleNode', () => {
  test('turns a node on then off without mutating input', () => {
    const start = ['atk']
    const on = toggleNode(data, start, 'sword')
    expect(on).toEqual(['atk', 'sword'])
    expect(start).toEqual(['atk'])
    expect(toggleNode(data, on, 'sword')).toEqual(['atk'])
  })

  test('swaps the other member of a choice group', () => {
    const withDance = toggleNode(data, ['atk'], 'dance')
    expect(toggleNode(data, withDance, 'river')).toEqual(['atk', 'river'])
  })

  test('ignores unknown node ids', () => {
    expect(toggleNode(data, ['atk'], 'ghost')).toEqual(['atk'])
  })
})

describe('activateAll', () => {
  test('turns on every node but only the first of each choice group', () => {
    expect(activateAll(data)).toEqual(['hp', 'atk', 'sword', 'dance', 'glow'])
  })
})

describe('sumStats', () => {
  test('adds unlocked effects and active node stats by label and unit', () => {
    expect(sumStats(data, ['atk'])).toEqual([
      { label: 'HP', value: 250, unit: 'flat' },
      { label: 'Attack', value: 50, unit: 'flat' },
      { label: 'Attack', value: 4.5, unit: 'percent' },
    ])
  })

  test('avoids float noise when adding decimals', () => {
    const d = { ...data, effects: [], nodes: [node({ id: 'a', stats: [{ label: 'X', value: 0.1, unit: 'percent' }] }), node({ id: 'b', stats: [{ label: 'X', value: 0.2, unit: 'percent' }] })] }
    expect(sumStats(d, ['a', 'b'])).toEqual([{ label: 'X', value: 0.3, unit: 'percent' }])
  })
})

describe('encodeBuild / decodeBuild', () => {
  test('round-trips a build', () => {
    const ids = ['atk', 'sword', 'river']
    expect(decodeBuild(data, encodeBuild(ids))).toEqual(ids)
  })

  test('drops unknown ids, duplicates and choice conflicts', () => {
    expect(decodeBuild(data, 'atk.ghost.atk.dance.river')).toEqual(['atk', 'dance'])
  })

  test('returns empty build for empty or missing input', () => {
    expect(decodeBuild(data, '')).toEqual([])
    expect(decodeBuild(data, null)).toEqual([])
  })
})

describe('parseReforge', () => {
  test('returns null for missing or malformed json', () => {
    expect(parseReforge(null)).toBeNull()
    expect(parseReforge('oops')).toBeNull()
    expect(parseReforge({ nodes: 'x' })).toBeNull()
  })

  test('fills defaults for optional arrays and costs', () => {
    expect(parseReforge({ nodes: [node({ id: 'a' })] })).toEqual({
      cost_base: 21,
      cost_bonus: 0,
      nodes: [node({ id: 'a' })],
      effects: [],
      presets: [],
    })
  })

  test('returns null when nodes is empty and no ex anchor', () => {
    expect(parseReforge({ nodes: [] })).toBeNull()
  })

  test('drops nodes missing required fields', () => {
    const parsed = parseReforge({ nodes: [node({ id: 'a' }), { id: 'b' }] })
    expect(parsed?.nodes.map(n => n.id)).toEqual(['a'])
  })
})

describe('validateReforge', () => {
  test('accepts valid data', () => {
    expect(validateReforge(data)).toEqual([])
  })

  test('reports duplicate ids, bad numbers, lone choices, bad refs and position clashes', () => {
    const bad: ReforgeData = {
      ...data,
      cost_base: -1,
      nodes: [
        node({ id: 'a' }),
        node({ id: 'a', col: 2 }),
        node({ id: 'b', cost: -2, stage: 0, col: 3 }),
        node({ id: 'c', col: 1, choice_group: 'solo', linked_to: 'zzz' }),
      ],
      presets: [{ id: 'p', name: 'x', node_ids: ['nope'] }],
    }
    // cost_base, duplicate id, cost, stage, lone choice, linked_to, preset ref, slot clash (a & c)
    expect(validateReforge(bad)).toHaveLength(8)
  })

  test('allows members of one choice group to share a slot', () => {
    expect(validateReforge({ ...data, nodes: data.nodes.filter(n => n.choice_group === 'ult'), presets: [] })).toEqual([])
  })
})

describe('toGuideBuild / parseGuideBuild', () => {
  test('returns null when nothing is picked', () => {
    expect(toGuideBuild([], null)).toBeNull()
  })

  test('keeps nodes and ex id', () => {
    expect(toGuideBuild(['atk'], null)).toEqual({ nodes: ['atk'], ex: null })
    expect(toGuideBuild([], 'char-1')).toEqual({ nodes: [], ex: 'char-1' })
  })

  test('parses a stored build against the current tree', () => {
    expect(parseGuideBuild({ nodes: ['atk', 'river'], ex: 'char-1' }, data))
      .toEqual({ nodes: ['atk', 'river'], ex: 'char-1', missing: 0 })
  })

  test('drops nodes removed from the tree and counts them', () => {
    expect(parseGuideBuild({ nodes: ['atk', 'gone', 'old'], ex: null }, data))
      .toEqual({ nodes: ['atk'], ex: null, missing: 2 })
  })

  test('returns null for malformed or empty builds', () => {
    expect(parseGuideBuild(null, data)).toBeNull()
    expect(parseGuideBuild('atk', data)).toBeNull()
    expect(parseGuideBuild({ nodes: [], ex: null }, data)).toBeNull()
    expect(parseGuideBuild({ nodes: [1, 2], ex: 5 }, data)).toBeNull()
  })
})

describe('newReforgeId', () => {
  test('makes unique url-safe ids without the build separator', () => {
    const ids = Array.from({ length: 200 }, () => newReforgeId('n'))
    expect(new Set(ids).size).toBe(200)
    for (const id of ids) expect(id).toMatch(/^n_[a-z0-9]+$/)
  })
})

describe('eligibleExAnchors', () => {
  const ex = (classes: string[]) => ({ name: 'EX', description: 'd', exclusive_classes: classes })
  const chars = [
    { id: '1', name: 'Coquelic', reforge: { ...data, ex_anchor: ex(['Endura', 'Catalyst']) } },
    { id: '2', name: 'NOX', reforge: { ...data, ex_anchor: ex([]) } },
    { id: '3', name: 'Plain', reforge: data },
    { id: '4', name: 'None', reforge: null },
  ]

  test('lists anchors open to every class or matching the job class', () => {
    expect(eligibleExAnchors(chars, 'Endura').map(c => c.character_id)).toEqual(['1', '2'])
    expect(eligibleExAnchors(chars, 'Striker').map(c => c.character_id)).toEqual(['2'])
  })
})

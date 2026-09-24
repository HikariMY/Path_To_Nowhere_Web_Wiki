import { describe, expect, test } from 'vitest'
import type { ReforgeData, ReforgeNode, ReforgeSlotId } from '../types/models'
import {
  COST_CAP,
  COST_LEAP_BONUS,
  REFORGE_SLOTS,
  STAGE_COST_CAPS,
  activateAll,
  decodeBuild,
  encodeBuild,
  isOverCap,
  listExAnchors,
  newReforgeId,
  nodeCategory,
  parseGuideBuild,
  parseReforge,
  sanitizeBuild,
  slotDef,
  sumStats,
  toGuideBuild,
  toggleNode,
  totalCost,
  validateReforge,
} from './reforge'

const node = (id: string, slot: ReforgeSlotId, cost: number, over: Partial<ReforgeNode> = {}): ReforgeNode => ({
  id, slot, name: id, cost, ...over,
})

const emptyStages = () => [1, 2, 3, 4].map(stage => ({ stage, intensify: [], materials: [] }))

// โครงของ Coquelic จากภาพในเกม
const data: ReforgeData = {
  nodes: [
    node('hp', 's1-top-a', 1, { stats: [{ label: 'HP', value: 4.5, unit: 'percent' }] }),
    node('sf', 's1-top-b', 3),
    node('atk', 's1-bot-a', 1, { stats: [{ label: 'Attack', value: 4.5, unit: 'percent' }] }),
    node('sword', 's1-bot-b', 3),
    node('na', 's2-top-a', 2),
    node('heal', 's2-bot-a', 2),
    node('dance', 's2-bot-b', 5),
    node('river', 's2-bot-b', 5),
    node('core', 's3-top-a', 2),
    node('aspd', 's3-bot-a', 2),
    node('bab', 's4-bot-a', 5),
    node('glow', 's4-bot-b', 3),
    node('momentum', 's4-bot-b', 3),
  ],
  stages: [
    { stage: 1, intensify: [{ label: 'HP', value: 250, unit: 'flat' }, { label: 'Attack', value: 25, unit: 'flat' }], materials: [{ name: 'Core', qty: 3 }] },
    { stage: 2, intensify: [{ label: 'Attack', value: 25, unit: 'flat' }], materials: [] },
    { stage: 3, intensify: [], materials: [] },
    { stage: 4, intensify: [], materials: [] },
  ],
  presets: [{ id: 'p1', name: 'แนะนำ', node_ids: ['atk', 'sword', 'river'] }],
}

describe('layout', () => {
  test('has the twelve fixed node slots of the game', () => {
    expect(REFORGE_SLOTS).toHaveLength(12)
    expect(slotDef('s2-bot-b')).toMatchObject({ stage: 2, row: 'bottom', side: 'b', category: 'special', defaultCost: 5 })
    expect(slotDef('s4-bot-a')).toMatchObject({ stage: 4, row: 'bottom', side: 'a', category: 'special', defaultCost: 5 })
    expect(slotDef('s3-top-a')).toMatchObject({ stage: 3, category: 'attribute', defaultCost: 2 })
  })

  test('derives a node category from its slot', () => {
    expect(nodeCategory(node('x', 's1-top-a', 1))).toBe('attribute')
    expect(nodeCategory(node('x', 's1-top-b', 3))).toBe('special')
  })

  test('cost cap is the stage IV limit plus the two COST orbs', () => {
    expect(STAGE_COST_CAPS).toEqual([4, 8, 12, 16])
    expect(COST_LEAP_BONUS).toBe(5)
    expect(COST_CAP).toBe(21)
  })
})

describe('totalCost / isOverCap', () => {
  test('sums cost of active nodes and ignores unknown ids', () => {
    expect(totalCost(data, ['atk', 'sword', 'river', 'ghost'])).toBe(9)
  })

  test('flags builds above 21 without blocking them', () => {
    expect(isOverCap(data, activateAll(data))).toBe(true)
    expect(isOverCap(data, ['atk', 'sword', 'river'])).toBe(false)
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

  test('swaps the other node sharing the slot', () => {
    const withDance = toggleNode(data, ['atk'], 'dance')
    expect(toggleNode(data, withDance, 'river')).toEqual(['atk', 'river'])
  })

  test('ignores unknown node ids', () => {
    expect(toggleNode(data, ['atk'], 'ghost')).toEqual(['atk'])
  })
})

describe('activateAll / sanitizeBuild', () => {
  test('turns on every node but only the first of each choice slot', () => {
    expect(activateAll(data)).toEqual(['hp', 'sf', 'atk', 'sword', 'na', 'heal', 'dance', 'core', 'aspd', 'bab', 'glow'])
  })

  test('keeps real ids in order and resolves choice conflicts', () => {
    expect(sanitizeBuild(data, ['river', 'ghost', 'atk', 'dance', 'atk'])).toEqual(['river', 'atk'])
  })
})

describe('sumStats', () => {
  test('adds stage intensify stats and active node stats by label and unit', () => {
    expect(sumStats(data, ['atk'])).toEqual([
      { label: 'HP', value: 250, unit: 'flat' },
      { label: 'Attack', value: 50, unit: 'flat' },
      { label: 'Attack', value: 4.5, unit: 'percent' },
    ])
  })

  test('avoids float noise when adding decimals', () => {
    const d = {
      ...data,
      stages: emptyStages(),
      nodes: [
        node('a', 's1-top-a', 1, { stats: [{ label: 'X', value: 0.1, unit: 'percent' }] }),
        node('b', 's1-bot-a', 1, { stats: [{ label: 'X', value: 0.2, unit: 'percent' }] }),
      ],
    }
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

  test('fills all four stages and optional arrays', () => {
    expect(parseReforge({ nodes: [node('a', 's1-top-a', 1)] })).toEqual({
      nodes: [node('a', 's1-top-a', 1)],
      stages: emptyStages(),
      presets: [],
    })
  })

  test('keeps stage data by stage number and ignores unknown stages', () => {
    const parsed = parseReforge({
      nodes: [node('a', 's1-top-a', 1)],
      stages: [
        { stage: 2, intensify: [{ label: 'HP', value: 1, unit: 'flat' }], materials: [{ name: 'M', qty: 2 }] },
        { stage: 9, intensify: [], materials: [] },
      ],
    })
    expect(parsed?.stages[1]).toEqual({ stage: 2, intensify: [{ label: 'HP', value: 1, unit: 'flat' }], materials: [{ name: 'M', qty: 2 }] })
    expect(parsed?.stages.map(s => s.stage)).toEqual([1, 2, 3, 4])
  })

  test('drops nodes without a known slot, such as the old free-position format', () => {
    const legacy = { id: 'old', name: 'old', category: 'attribute', cost: 1, stage: 1, row: 'top', col: 1 }
    expect(parseReforge({ nodes: [legacy] })).toBeNull()
    expect(parseReforge({ nodes: [legacy, node('a', 's1-top-a', 1)] })?.nodes.map(n => n.id)).toEqual(['a'])
  })
})

describe('validateReforge', () => {
  test('accepts valid data', () => {
    expect(validateReforge(data)).toEqual([])
  })

  test('reports bad ids, costs, crowded slots, materials and preset refs', () => {
    const stages = emptyStages()
    stages[0] = { stage: 1, intensify: [], materials: [{ name: 'A', qty: 1 }, { name: 'B', qty: 1 }, { name: 'C', qty: 1 }] }
    stages[1] = { stage: 2, intensify: [], materials: [{ name: 'D', qty: 0 }] }
    const bad: ReforgeData = {
      nodes: [
        node('a', 's1-top-a', 1),
        node('a', 's1-bot-a', 1),                 // duplicate id
        node('b.c', 's1-top-b', -1),              // bad id + negative cost
        node('d', 's1-top-a', 1),                 // second node in a left slot
        node('e', 's2-bot-b', 5),
        node('f', 's2-bot-b', 5),
        node('g', 's2-bot-b', 5),                 // third node in a choice slot
      ],
      stages,
      presets: [{ id: 'p', name: 'x', node_ids: ['nope'] }],
    }
    // duplicate id, bad id, negative cost, left slot >1, choice slot >2, 3 materials, qty 0, preset ref
    expect(validateReforge(bad)).toHaveLength(8)
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

describe('listExAnchors', () => {
  const ex = (classes: string[]) => ({ name: 'EX', description: 'd', exclusive_classes: classes })
  const chars = [
    { id: '1', name: 'Coquelic', reforge: { ...data, ex_anchor: ex(['guard', 'inclusion']) } },
    { id: '2', name: 'NOX', reforge: { ...data, ex_anchor: ex([]) } },
    { id: '3', name: 'Plain', reforge: data },
    { id: '4', name: 'None', reforge: null },
  ]

  test('lists every EX anchor, even for other classes, and marks which match', () => {
    expect(listExAnchors(chars, 'guard').map(o => [o.character_id, o.matches_class])).toEqual([['1', true], ['2', true]])
    expect(listExAnchors(chars, 'fury').map(o => [o.character_id, o.matches_class])).toEqual([['1', false], ['2', true]])
  })
})

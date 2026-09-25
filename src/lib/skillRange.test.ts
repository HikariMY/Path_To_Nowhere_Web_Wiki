import { describe, expect, test } from 'vitest'
import { GRID_PRESETS, rangeCellSize, skillRanges } from './skillRange'

const grid = (rows: number, cols: number) => ({ rows, cols, cells: Array(rows * cols).fill(0) })

describe('GRID_PRESETS', () => {
  test('includes the wide grids needed for long-range skills', () => {
    const sizes = GRID_PRESETS.map(p => `${p.rows}x${p.cols}`)
    expect(sizes).toEqual(expect.arrayContaining(['3x6', '1x8', '3x8']))
  })

  test('labels use the multiplication sign and match rows and cols', () => {
    for (const p of GRID_PRESETS) expect(p.label).toBe(`${p.rows}×${p.cols}`)
  })
})

describe('skillRanges', () => {
  test('returns the ranges that have cells, in order', () => {
    const a = grid(3, 3)
    const c = grid(1, 8)
    expect(skillRanges({ range: a, range2: undefined, range3: c })).toEqual([a, c])
  })

  test('skips empty or missing ranges', () => {
    expect(skillRanges({})).toEqual([])
    expect(skillRanges({ range: { rows: 0, cols: 0, cells: [] } })).toEqual([])
  })
})

describe('rangeCellSize', () => {
  test('shrinks cells as grids get wider', () => {
    expect(rangeCellSize(3)).toBe('1.75rem')
    expect(rangeCellSize(5)).toBe('1.4rem')
    expect(rangeCellSize(6)).toBe('1.2rem')
    expect(rangeCellSize(8)).toBe('1.2rem')
  })
})

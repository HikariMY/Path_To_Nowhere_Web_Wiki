import { describe, expect, test } from 'vitest'
import { toggleFavorite } from './favorites'

describe('toggleFavorite', () => {
  test('adds a character that is not a favourite yet', () => {
    const { next, added } = toggleFavorite(new Set(['a']), 'b')
    expect(added).toBe(true)
    expect([...next].sort()).toEqual(['a', 'b'])
  })

  test('removes a character that is already a favourite', () => {
    const { next, added } = toggleFavorite(new Set(['a', 'b']), 'a')
    expect(added).toBe(false)
    expect([...next]).toEqual(['b'])
  })

  test('never changes the set it was given', () => {
    const start = new Set(['a'])
    toggleFavorite(start, 'b')
    toggleFavorite(start, 'a')
    expect([...start]).toEqual(['a'])
  })
})

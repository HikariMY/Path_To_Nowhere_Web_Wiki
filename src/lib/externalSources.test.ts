import { describe, expect, test } from 'vitest'
import { collectSources } from './externalSources'

const now = new Date('2026-11-17T12:00:00+07:00')

describe('collectSources', () => {
  const input = {
    cnGuides: [{ id: 'g1', source_title: '承霄角色简评', source_author: '白色茵雨', source_url: 'https://wiki.biligame.com/wqmt/a', checked_at: '2026-06-18', character: { name: 'Chengxiao', slug: 'chengxiao' } }],
    modeSources: [{ id: 's1', title: '暗域论', author: '宴与猫', url: 'https://wiki.biligame.com/wqmt/b', checked_at: '2026-11-10', mode: { name: 'Dark Area', slug: 'dark-domain' } }],
    tierLists: [
      { id: 't1', title: 'Official Tier List · CN', source: { title: '角色强度榜', author: '碳酸冰红茶', url: 'https://wiki.biligame.com/wqmt/c', date: '2026-08-07' } },
      { id: 't2', title: 'No source', source: null },
    ],
  }

  test('merges every credit into one list with where it is used', () => {
    const rows = collectSources(input, now)
    expect(rows.map(r => [r.kind, r.title, r.usedAt.href])).toEqual([
      ['cn-guide', '承霄角色简评', '/characters/chengxiao?tab=guides&src=cn'],
      ['mode', '暗域论', '/modes/dark-domain'],
      ['tier-list', '角色强度榜', '/tier-lists/t1'],
    ])
  })

  test('flags rows not checked for 60 days; tier list credits cannot be marked checked', () => {
    const rows = collectSources(input, now)
    expect(rows.map(r => [r.kind, r.stale, r.canMarkChecked])).toEqual([
      ['cn-guide', true, true],
      ['mode', false, true],
      ['tier-list', true, false],
    ])
  })

  test('drops rows whose link is not http(s)', () => {
    const rows = collectSources({ ...input, modeSources: [{ ...input.modeSources[0], url: 'javascript:alert(1)' }] }, now)
    expect(rows.some(r => r.kind === 'mode')).toBe(false)
  })
})

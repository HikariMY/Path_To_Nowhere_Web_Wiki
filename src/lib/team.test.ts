import { describe, expect, test } from 'vitest'
import {
  MAX_TEAM_SIZE, TEAM_TITLE_MAX, addMember, moveMember, parseMembers, removeMember, setMemberBuild,
  teamSummary, validateTeam, type TeamMember,
} from './team'

const m = (character_id: string, build_id: string | null = null): TeamMember => ({ character_id, build_id })

describe('addMember', () => {
  test('appends a new character without a build', () => {
    expect(addMember([m('a')], 'b')).toEqual([m('a'), m('b')])
  })

  test('ignores a character already in the team', () => {
    expect(addMember([m('a')], 'a')).toEqual([m('a')])
  })

  test('stops at MAX_TEAM_SIZE (6)', () => {
    expect(MAX_TEAM_SIZE).toBe(6)
    const full = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => m(id))
    expect(addMember(full, 'g')).toEqual(full)
  })

  test('never changes the array it was given', () => {
    const start = [m('a')]
    addMember(start, 'b')
    expect(start).toEqual([m('a')])
  })
})

describe('removeMember / moveMember / setMemberBuild', () => {
  test('removeMember drops only that character', () => {
    expect(removeMember([m('a'), m('b')], 'a')).toEqual([m('b')])
  })

  test('moveMember swaps with its neighbour and ignores moves off the ends', () => {
    expect(moveMember([m('a'), m('b'), m('c')], 1, -1).map(x => x.character_id)).toEqual(['b', 'a', 'c'])
    expect(moveMember([m('a'), m('b')], 1, 1).map(x => x.character_id)).toEqual(['a', 'b'])
  })

  test('setMemberBuild sets or clears the build of one member', () => {
    expect(setMemberBuild([m('a'), m('b')], 'b', 'x')).toEqual([m('a'), m('b', 'x')])
    expect(setMemberBuild([m('a', 'x')], 'a', null)).toEqual([m('a')])
  })
})

describe('teamSummary', () => {
  const chars = new Map([
    ['a', { job_class: 'guard', ability_tags: ['Tank', 'Taunt'] }],
    ['b', { job_class: 'guard', ability_tags: ['Tank'] }],
    ['c', { job_class: 'reticle', ability_tags: null }],
  ])

  test('counts classes and ability tags across the team, most common first', () => {
    const summary = teamSummary([m('a'), m('b'), m('c')], chars)
    expect(summary.classes).toEqual([{ key: 'guard', count: 2 }, { key: 'reticle', count: 1 }])
    expect(summary.tags).toEqual([{ key: 'Tank', count: 2 }, { key: 'Taunt', count: 1 }])
  })

  test('skips members whose character is unknown', () => {
    expect(teamSummary([m('zzz')], chars)).toEqual({ classes: [], tags: [] })
  })
})

describe('validateTeam', () => {
  test('needs a title and at least one member', () => {
    expect(validateTeam({ title: '  ', members: [m('a')] })).toBe('กรุณาตั้งชื่อทีม')
    expect(validateTeam({ title: 'PvE', members: [] })).toBe('เลือกตัวละครอย่างน้อย 1 ตัว')
  })

  test('limits title length and team size', () => {
    expect(validateTeam({ title: 'x'.repeat(TEAM_TITLE_MAX + 1), members: [m('a')] })).toMatch(/ชื่อทีม/)
    expect(validateTeam({ title: 'PvE', members: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(id => m(id)) })).toMatch(/6/)
  })

  test('accepts a valid team', () => {
    expect(validateTeam({ title: 'PvE', members: [m('a')] })).toBeNull()
  })
})

describe('parseMembers', () => {
  test('keeps well-formed members from stored JSON', () => {
    expect(parseMembers([{ character_id: 'a', build_id: 'x' }, { character_id: 'b' }])).toEqual([m('a', 'x'), m('b')])
  })

  test('drops junk, duplicates, and anything past six', () => {
    const raw = [null, 42, { build_id: 'x' }, { character_id: 'a' }, { character_id: 'a' },
      ...['b', 'c', 'd', 'e', 'f', 'g'].map(id => ({ character_id: id }))]
    expect(parseMembers(raw).map(x => x.character_id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(parseMembers('nope')).toEqual([])
  })
})

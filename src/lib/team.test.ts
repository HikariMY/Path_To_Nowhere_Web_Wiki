import { describe, expect, test } from 'vitest'
import {
  EMPTY_CUSTOM_CBS, MAX_TEAM_SIZE, TEAM_DESCRIPTION_MAX, TEAM_TITLE_MAX, addMember, memberBuild,
  memberCrimebrands, moveMember, parseMembers, removeMember, setMemberBuild, setMemberCustomCb, teamSummary,
  validateTeam, type CustomCbSlots, type TeamMember,
} from './team'

const m = (character_id: string, build_id: string | null = null, custom_cbs: CustomCbSlots = EMPTY_CUSTOM_CBS): TeamMember =>
  ({ character_id, build_id, custom_cbs })

const builds = new Map([
  ['b1', { id: 'b1', character_id: 'a', build_name: 'DPS', slots: [{ cb_id: 'x', piece: 1 }, { cb_id: 'x', piece: 2 }] }],
  ['b2', { id: 'b2', character_id: 'z', build_name: 'Other', slots: [{ cb_id: 'y', piece: 1 }] }],
])

describe('memberBuild', () => {
  test('returns the chosen build when it belongs to that character', () => {
    expect(memberBuild(m('a', 'b1'), builds)?.id).toBe('b1')
  })

  test('ignores a build that belongs to a different character, or none chosen', () => {
    expect(memberBuild(m('a', 'b2'), builds)).toBeUndefined()
    expect(memberBuild(m('a'), builds)).toBeUndefined()
    expect(memberBuild(m('a', 'gone'), builds)).toBeUndefined()
  })
})

describe('memberCrimebrands', () => {
  test('shows freely chosen crimebrands, keeping each one in its own slot position', () => {
    const member = m('a', null, [{ cb_id: 'any', piece: 3 }, null, { cb_id: 'any', piece: 1 }])
    expect(memberCrimebrands(member, builds)).toEqual({
      buildName: null,
      slots: [{ position: 0, cb_id: 'any', piece: 3 }, { position: 2, cb_id: 'any', piece: 1 }],
    })
  })

  test('falls back to the recommended build for teams saved before custom picks existed', () => {
    expect(memberCrimebrands(m('a', 'b1'), builds)).toEqual({
      buildName: 'DPS',
      slots: [{ position: 0, cb_id: 'x', piece: 1 }, { position: 1, cb_id: 'x', piece: 2 }],
    })
  })

  test('is empty when nothing is chosen or the build belongs to someone else', () => {
    expect(memberCrimebrands(m('a'), builds)).toEqual({ buildName: null, slots: [] })
    expect(memberCrimebrands(m('a', 'b2'), builds)).toEqual({ buildName: null, slots: [] })
  })
})

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

  test('setMemberBuild drops custom picks — only one kind is used at a time', () => {
    const custom = m('a', null, [{ cb_id: 'c', piece: 1 }, null, null])
    expect(setMemberBuild([custom], 'a', 'x')).toEqual([m('a', 'x')])
  })
})

describe('setMemberCustomCb', () => {
  test('sets one slot to any crimebrand and drops the recommended build', () => {
    expect(setMemberCustomCb([m('a', 'b1'), m('b')], 'a', 1, { cb_id: 'c', piece: 2 }))
      .toEqual([m('a', null, [null, { cb_id: 'c', piece: 2 }, null]), m('b')])
  })

  test('clears a slot without moving the others', () => {
    const start = [m('a', null, [{ cb_id: 'c', piece: 1 }, { cb_id: 'd', piece: 2 }, null])]
    expect(setMemberCustomCb(start, 'a', 0, null)).toEqual([m('a', null, [null, { cb_id: 'd', piece: 2 }, null])])
  })

  test('never changes the members it was given', () => {
    const start = [m('a')]
    setMemberCustomCb(start, 'a', 0, { cb_id: 'c', piece: 1 })
    expect(start).toEqual([m('a')])
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

  test('limits description length', () => {
    const description = 'ก'.repeat(TEAM_DESCRIPTION_MAX + 1)
    expect(validateTeam({ title: 'PvE', description, members: [m('a')] })).toMatch(/คำอธิบาย/)
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

  test('reads custom crimebrands, turning bad slots into empty ones and dropping extras', () => {
    const raw = [{
      character_id: 'a',
      custom_cbs: [{ cb_id: 'c', piece: 2 }, { cb_id: 'd', piece: 9 }, 'junk', { cb_id: 'e', piece: 1 }],
    }]
    expect(parseMembers(raw)).toEqual([m('a', null, [{ cb_id: 'c', piece: 2 }, null, null])])
  })

  test('lets custom picks win when stored data has both kinds', () => {
    const raw = [{ character_id: 'a', build_id: 'b1', custom_cbs: [{ cb_id: 'c', piece: 1 }] }]
    expect(parseMembers(raw)).toEqual([m('a', null, [{ cb_id: 'c', piece: 1 }, null, null])])
  })
})

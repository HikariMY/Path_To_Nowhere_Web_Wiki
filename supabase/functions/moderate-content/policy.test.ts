import { describe, expect, test } from 'vitest'
import {
  AI_CHECKS, FLAG_THRESHOLD, MAX_BODY_CHARS, buildTypeSafeRequest, contentForModeration, decideFlag, isModeratedTable,
} from './policy.ts'

describe('isModeratedTable', () => {
  test('accepts only the user-content tables', () => {
    expect(isModeratedTable('forum_posts')).toBe(true)
    expect(isModeratedTable('character_guides')).toBe(true)
    expect(isModeratedTable('profiles')).toBe(false)
  })
})

describe('contentForModeration', () => {
  test('uses title and body for forum posts', () => {
    expect(contentForModeration('forum_posts', { title: 'หา Bianca', content: 'ใครมีบ้าง' }))
      .toEqual({ content_type: 'forum post', title: 'หา Bianca', body: 'ใครมีบ้าง' })
  })

  test('joins guide sections and tier list descriptions into the body', () => {
    const guide = contentForModeration('character_guides', {
      title: 'ไกด์', sections: [{ heading: 'สกิล', body: 'อัป S2 ก่อน' }, { heading: 'ทีม', body: 'คู่กับ Hecate' }],
    })
    expect(guide.body).toBe('สกิล\nอัป S2 ก่อน\n\nทีม\nคู่กับ Hecate')
    expect(contentForModeration('tier_lists', { title: 'PvE', description: null }).body).toBe('')
  })

  test('keeps the start and the end of very long bodies, so padding cannot hide a payload', () => {
    const content = 'ก'.repeat(MAX_BODY_CHARS * 2) + 'PAYLOAD'
    const { body } = contentForModeration('forum_replies', { content })
    expect(body.length).toBeLessThanOrEqual(MAX_BODY_CHARS + 5)
    expect(body.startsWith('กกก')).toBe(true)
    expect(body.endsWith('PAYLOAD')).toBe(true)
    expect(body).toContain('\n…\n')
  })

  test('leaves bodies within the limit untouched', () => {
    expect(contentForModeration('forum_replies', { content: 'สั้น ๆ' }).body).toBe('สั้น ๆ')
  })
})

describe('buildTypeSafeRequest', () => {
  test('asks one Noul per check about the same state', () => {
    const req = buildTypeSafeRequest({ content_type: 'forum post', title: 't', body: 'b' })
    expect(req.model).toBe('jev-latest')
    expect(Object.keys(req.questions)).toEqual(AI_CHECKS.map(c => c.key))
    expect(Object.values(req.questions).every(q => q.type === 'noul')).toBe(true)
    expect(req.state).toMatchObject({ content_type: 'forum post', title: 't', body: 'b' })
  })
})

describe('decideFlag', () => {
  const answers = (scores: Record<string, number>) =>
    Object.fromEntries(Object.entries(scores).map(([k, noul]) => [k, { type: 'noul', noul }]))

  test('does not flag when every score is below the threshold', () => {
    expect(decideFlag(answers({ spam: 0.2, harassment: FLAG_THRESHOLD - 0.01 })).flagged).toBe(false)
  })

  test('flags with the reason of the highest score over the threshold', () => {
    const decision = decideFlag(answers({ spam: 0.75, harassment: 0.1, hate: 0.9, sexual: 0.3 }))
    expect(decision).toMatchObject({ flagged: true, check: 'hate', reason: 'harassment' })
    expect(decision.scores).toEqual({ spam: 0.75, harassment: 0.1, hate: 0.9, sexual: 0.3 })
  })

  test('ignores missing or malformed answers', () => {
    expect(decideFlag({ spam: { type: 'choice' } }).flagged).toBe(false)
    expect(decideFlag({}).flagged).toBe(false)
  })
})

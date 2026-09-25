import { describe, expect, test } from 'vitest'
import { COMMENT_MAX, canDeleteComment, canEditComment, validateComment } from './guideComments'

describe('validateComment', () => {
  test('rejects empty or whitespace-only comments', () => {
    expect(validateComment('   ')).toBe('พิมพ์คอมเมนต์ก่อนส่ง')
  })

  test('limits comments to COMMENT_MAX characters', () => {
    expect(COMMENT_MAX).toBe(1000)
    expect(validateComment('ก'.repeat(COMMENT_MAX + 1))).toMatch(/1000/)
    expect(validateComment('ก'.repeat(COMMENT_MAX))).toBeNull()
  })

  test('accepts a normal comment', () => {
    expect(validateComment('ขอบคุณสำหรับไกด์ครับ')).toBeNull()
  })
})

describe('comment permissions', () => {
  const comment = { author_id: 'u1' }

  test('only the author can edit', () => {
    expect(canEditComment(comment, 'u1')).toBe(true)
    expect(canEditComment(comment, 'u2')).toBe(false)
    expect(canEditComment(comment, null)).toBe(false)
  })

  test('the author or staff can delete', () => {
    expect(canDeleteComment(comment, 'u1', false)).toBe(true)
    expect(canDeleteComment(comment, 'u2', true)).toBe(true)
    expect(canDeleteComment(comment, 'u2', false)).toBe(false)
    expect(canDeleteComment(comment, null, false)).toBe(false)
  })
})

import { describe, expect, test } from 'vitest'
import { canUnlinkIdentity, providerLabel, safeNextPath } from './authRedirect'

describe('safeNextPath', () => {
  test('keeps same-site paths with query and hash', () => {
    expect(safeNextPath('/characters/bianca?tab=reforge#top')).toBe('/characters/bianca?tab=reforge#top')
  })

  test('rejects anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'characters', '']) {
      expect(safeNextPath(bad)).toBe('/')
    }
  })

  test('never sends the user back to the auth pages', () => {
    expect(safeNextPath('/login')).toBe('/')
    expect(safeNextPath('/auth/callback?next=/x')).toBe('/')
  })

  test('falls back to / for missing values', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath(undefined)).toBe('/')
  })
})

describe('canUnlinkIdentity', () => {
  test('allows unlinking only while another way to sign in remains', () => {
    expect(canUnlinkIdentity([{ provider: 'email' }, { provider: 'discord' }])).toBe(true)
    expect(canUnlinkIdentity([{ provider: 'discord' }])).toBe(false)
    expect(canUnlinkIdentity([])).toBe(false)
  })
})

describe('providerLabel', () => {
  test('names known providers and falls back to the raw id', () => {
    expect(providerLabel('discord')).toBe('Discord')
    expect(providerLabel('google')).toBe('Google')
    expect(providerLabel('email')).toBe('อีเมล')
    expect(providerLabel('github')).toBe('github')
  })
})

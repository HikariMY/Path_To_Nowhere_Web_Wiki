import { describe, expect, test } from 'vitest'
import { authCallbackUrl, callbackError, canUnlinkIdentity, providerLabel, safeNextPath } from './authRedirect'

describe('authCallbackUrl', () => {
  test('points at the callback page and carries a safe next path', () => {
    expect(authCallbackUrl('https://wiki.example', '/characters/bianca?tab=reforge'))
      .toBe('https://wiki.example/auth/callback?next=%2Fcharacters%2Fbianca%3Ftab%3Dreforge')
  })

  test('replaces unsafe or missing next paths with /', () => {
    expect(authCallbackUrl('https://wiki.example', '//evil.example')).toBe('https://wiki.example/auth/callback?next=%2F')
    expect(authCallbackUrl('https://wiki.example')).toBe('https://wiki.example/auth/callback?next=%2F')
  })

  test('marks identity linking so the callback can tell it apart from a sign-in', () => {
    expect(authCallbackUrl('https://wiki.example', '/settings', 'link'))
      .toBe('https://wiki.example/auth/callback?next=%2Fsettings&mode=link')
  })
})

describe('callbackError', () => {
  test('reads the description from the query string', () => {
    expect(callbackError('?error=access_denied&error_description=User+denied', '')).toBe('User denied')
  })

  test('reads errors that come back in the hash', () => {
    expect(callbackError('', '#error=server_error&error_description=Database%20error')).toBe('Database error')
  })

  test('falls back to the error code, and to null when there is no error', () => {
    expect(callbackError('?error=access_denied', '')).toBe('access_denied')
    expect(callbackError('?next=%2F', '#access_token=abc')).toBeNull()
  })
})

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

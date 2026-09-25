import { describe, expect, test } from 'vitest'
import { BACKUP_TABLES, KEEP_DAYS, backupFileName, canSkipMissingTable, filesToPrune, orderColumns } from './backupPlan.ts'

describe('canSkipMissingTable', () => {
  test('skips a newer table whose migration has not been run yet', () => {
    expect(canSkipMissingTable('favorite_characters', { code: 'PGRST205' })).toBe(true)
    expect(canSkipMissingTable('reports', { code: '42P01' })).toBe(true)
    expect(canSkipMissingTable('teams', { code: 'PGRST205' })).toBe(true)
  })

  test('never skips a core table — a missing core table must fail the backup loudly', () => {
    expect(canSkipMissingTable('characters', { code: 'PGRST205' })).toBe(false)
    expect(canSkipMissingTable('profiles', { code: '42P01' })).toBe(false)
  })

  test('never skips other errors, even on optional tables', () => {
    expect(canSkipMissingTable('favorite_characters', { code: '42703' })).toBe(false)
    expect(canSkipMissingTable('reports', {})).toBe(false)
  })
})

describe('orderColumns', () => {
  test('pages game_info by its natural key because the live table has no id column', () => {
    expect(orderColumns('game_info')).toEqual(['category', 'key'])
  })

  test('pages every other table by id', () => {
    expect(orderColumns('characters')).toEqual(['id'])
    expect(orderColumns('profiles')).toEqual(['id'])
  })
})

describe('backupFileName', () => {
  test('names the file after the Thai calendar date', () => {
    // 02:00 เวลาไทย 26 ก.ย. = 19:00 UTC 25 ก.ย. (เวลาที่ workflow รัน)
    expect(backupFileName(new Date('2026-09-25T19:00:00Z'))).toBe('2026-09-26.json')
    expect(backupFileName(new Date('2026-09-25T16:59:00Z'))).toBe('2026-09-25.json')
  })
})

describe('filesToPrune', () => {
  const now = new Date('2026-09-25T19:00:00Z') // 26 ก.ย. เวลาไทย

  test('keeps KEEP_DAYS days of backups and prunes anything older', () => {
    expect(KEEP_DAYS).toBe(30)
    const names = ['2026-09-26.json', '2026-08-28.json', '2026-08-27.json', '2026-01-01.json']
    expect(filesToPrune(names, now)).toEqual(['2026-08-27.json', '2026-01-01.json'])
  })

  test('never touches files that are not dated backups', () => {
    expect(filesToPrune(['notes.txt', 'manual-before-migration.json', '.emptyFolderPlaceholder'], now)).toEqual([])
  })
})

describe('BACKUP_TABLES', () => {
  test('covers the content tables and leaves out admin logs', () => {
    for (const table of ['characters', 'crimebrands', 'events', 'tier_lists', 'profiles', 'favorite_characters', 'reports', 'teams']) {
      expect(BACKUP_TABLES).toContain(table)
    }
    expect(BACKUP_TABLES).not.toContain('admin_logs')
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length)
  })
})

import { describe, expect, test } from 'vitest'
import { BACKUP_TABLES, KEEP_DAYS, backupFileName, filesToPrune, orderColumns } from './backupPlan.ts'

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
    for (const table of ['characters', 'crimebrands', 'events', 'tier_lists', 'profiles']) {
      expect(BACKUP_TABLES).toContain(table)
    }
    expect(BACKUP_TABLES).not.toContain('admin_logs')
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length)
  })
})

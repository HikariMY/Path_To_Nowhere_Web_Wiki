// ============================================================
// Backup รายคืน — ดึงทุกตารางใน BACKUP_TABLES เก็บเป็น JSON ไฟล์เดียวใน bucket ส่วนตัว "backups"
// แล้วลบไฟล์ที่เก่ากว่า KEEP_DAYS วัน
//
// รันโดย GitHub Actions (.github/workflows/nightly-backup.yml) ด้วย Node 24:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup.ts
// service role key ข้าม RLS ได้ — ห้ามใส่ใน repo หรือโค้ดฝั่งเว็บ เก็บใน GitHub Secrets เท่านั้น
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BACKUP_BUCKET, BACKUP_TABLES, backupFileName, filesToPrune, orderColumns } from './backupPlan.ts'

const PAGE_SIZE = 1000

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`ไม่ได้ตั้งค่า ${name} (GitHub → Settings → Secrets and variables → Actions)`)
  return value
}

async function dumpTable(client: SupabaseClient, table: string): Promise<unknown[]> {
  let rows: unknown[] = []
  // เลื่อนตามจำนวนแถวที่ได้จริง และหยุดเมื่อได้หน้าว่าง — ถ้า Max Rows ของ Supabase ถูกตั้งต่ำกว่า
  // PAGE_SIZE หน้าจะสั้นกว่าที่ขอ การเลื่อนทีละ PAGE_SIZE จะข้ามแถวไปเงียบ ๆ
  while (true) {
    const query = orderColumns(table).reduce(
      (q, column) => q.order(column),
      client.from(table).select('*'),
    )
    const { data, error } = await query.range(rows.length, rows.length + PAGE_SIZE - 1)
    if (error) throw new Error(`อ่านตาราง ${table} ไม่สำเร็จ: ${error.message}`)
    if (data.length === 0) return rows
    rows = rows.concat(data)
  }
}

async function pruneOldBackups(client: SupabaseClient, now: Date): Promise<string[]> {
  const bucket = client.storage.from(BACKUP_BUCKET)
  const { data, error } = await bucket.list('', { limit: 1000 })
  if (error) throw new Error(`อ่านรายการไฟล์ใน ${BACKUP_BUCKET} ไม่สำเร็จ: ${error.message}`)
  const stale = filesToPrune(data.map(file => file.name), now)
  if (stale.length === 0) return []
  const { error: removeError } = await bucket.remove(stale)
  if (removeError) throw new Error(`ลบ backup เก่าไม่สำเร็จ: ${removeError.message}`)
  return stale
}

async function main(): Promise<void> {
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const now = new Date()

  const tables: Record<string, unknown[]> = {}
  for (const table of BACKUP_TABLES) {
    tables[table] = await dumpTable(client, table)
    console.info(`${table}: ${tables[table].length} แถว`)
  }

  const fileName = backupFileName(now)
  const body = JSON.stringify({ created_at: now.toISOString(), tables })
  const { error } = await client.storage
    .from(BACKUP_BUCKET)
    .upload(fileName, new Blob([body], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(`อัปโหลด ${fileName} ไม่สำเร็จ: ${error.message}`)
  console.info(`บันทึก ${BACKUP_BUCKET}/${fileName} (${(body.length / 1024).toFixed(0)} KB)`)

  const pruned = await pruneOldBackups(client, now)
  console.info(pruned.length ? `ลบ backup เก่า: ${pruned.join(', ')}` : 'ไม่มี backup เก่าให้ลบ')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

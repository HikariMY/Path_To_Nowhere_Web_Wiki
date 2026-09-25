// ============================================================
// Edge Function: moderate-content
// trigger ในฐานข้อมูล (supabase_migration_ai_moderation.sql) ยิงมาเมื่อมีกระทู้ / คำตอบ / ไกด์ / เทียร์ลิสต์ใหม่
// → ถาม TypeSafe ว่าเข้าข่ายสแปม / ก่อกวน / เหยียด / ไม่เหมาะสมไหม
// → ถ้าเกิน threshold ใส่รายงานจาก "AI" เข้าคิว /admin/reports ให้แอดมินตัดสิน (ไม่ลบ ไม่ซ่อนเอง)
//
// Secrets (npx supabase secrets set ...):
//   TYPESAFE_API_KEY           — คีย์ TypeSafe
//   MODERATION_WEBHOOK_SECRET  — ต้องตรงกับค่าใน Vault 'moderation_webhook_secret'
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY มีให้อัตโนมัติใน Edge Function
// Deploy แบบไม่ตรวจ JWT (ตรวจ secret ใน header เองแทน): --no-verify-jwt
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  TARGET_TYPE, buildTypeSafeRequest, contentForModeration, decideFlag, isModeratedTable,
  type TypeSafeRequest,
} from './policy.ts'

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone'
const RETRY_STATUSES = new Set([429, 529])
const RETRY_DELAY_MS = 1500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** เทียบ secret แบบใช้เวลาเท่ากันไม่ว่าต่างตรงไหน */
function secretMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/** เรียก TypeSafe — ลองใหม่ 1 ครั้งเมื่อโดน rate limit (429) หรือระบบแน่น (529) */
async function askTypeSafe(apiKey: string, request: TypeSafeRequest): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(TYPESAFE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (res.ok) {
      const data = await res.json() as { answers?: Record<string, unknown> }
      return data.answers ?? {}
    }
    if (attempt === 0 && RETRY_STATUSES.has(res.status)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      continue
    }
    throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  throw new Error('TypeSafe: retry exhausted')
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const secret = Deno.env.get('MODERATION_WEBHOOK_SECRET')
  if (!secret || !secretMatches(req.headers.get('x-moderation-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401)
  }
  const apiKey = Deno.env.get('TYPESAFE_API_KEY')
  if (!apiKey) return json({ error: 'TYPESAFE_API_KEY is not set' }, 500)

  let payload: { table?: unknown; id?: unknown }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const { table, id } = payload
  if (typeof table !== 'string' || !isModeratedTable(table) || typeof id !== 'string' || !UUID.test(id)) {
    return json({ error: 'invalid table or id' }, 400)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // อ่านแถวเองด้วย service role — ไม่เชื่อเนื้อหาที่ส่งมากับคำขอ
  const { data: row, error: rowError } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
  if (rowError) return json({ error: rowError.message }, 500)
  if (!row) return json({ skipped: 'content no longer exists' })

  const { data: author } = await supabase.from('profiles').select('role').eq('id', row.author_id).maybeSingle()
  if (author?.role === 'admin' || author?.role === 'moderator') return json({ skipped: 'staff content' })

  const content = contentForModeration(table, row)
  if (!content.title.trim() && !content.body.trim()) return json({ skipped: 'empty content' })

  // มีธงจาก AI ที่ยังรอแอดมินอยู่แล้ว → ไม่ต้องเสียค่าเรียก TypeSafe ซ้ำ
  const { data: openFlag } = await supabase
    .from('reports')
    .select('id')
    .eq('target_type', TARGET_TYPE[table])
    .eq('target_id', id)
    .eq('source', 'ai')
    .eq('status', 'open')
    .maybeSingle()
  if (openFlag) return json({ skipped: 'already flagged' })

  try {
    const decision = decideFlag(await askTypeSafe(apiKey, buildTypeSafeRequest(content)))
    if (Object.keys(decision.scores).length === 0) {
      console.warn('moderate-content: TypeSafe returned no Noul scores', { table, id })
    }
    if (!decision.flagged) return json({ flagged: false, scores: decision.scores })

    const top = decision.scores[decision.check!]
    const { error } = await supabase.from('reports').insert({
      reporter_id: null,
      source: 'ai',
      target_type: TARGET_TYPE[table],
      target_id: id,
      reason: decision.reason,
      detail: `AI ตรวจพบ: ${decision.check} (${Math.round(top * 100)}%)`,
      ai_scores: decision.scores,
    })
    // 23505 = มีธงเปิดอยู่แล้ว (คำขอซ้อนกันพอดี) — ถือว่าสำเร็จ
    if (error && error.code !== '23505') return json({ error: error.message }, 500)
    return json({ flagged: true, check: decision.check, scores: decision.scores })
  } catch (error) {
    console.error('moderate-content failed', { table, id, error: String(error) })
    return json({ error: 'moderation failed' }, 502)
  }
})

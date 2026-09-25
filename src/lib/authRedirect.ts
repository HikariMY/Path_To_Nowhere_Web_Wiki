// ============================================================
// ปลายทางหลังล็อกอิน + กฎการเชื่อมบัญชีภายนอก — logic ล้วน ทดสอบได้
// ============================================================

export type SocialProvider = 'discord' | 'google'
export const SOCIAL_PROVIDERS: readonly SocialProvider[] = ['discord', 'google']

/**
 * ปลายทางหลังล็อกอิน (?next=) — รับเฉพาะ path ในเว็บเดียวกัน
 * กัน open redirect เช่น //evil.com หรือ https://evil.com และไม่ส่งกลับไปหน้าล็อกอินซ้ำ
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  const path = next.split(/[?#]/)[0]
  if (path === '/login' || path === '/register' || path.startsWith('/auth/')) return '/'
  return next
}

/** URL ที่แพลตฟอร์มส่งกลับมาหลังล็อกอิน — ต้องอยู่ในรายการ Redirect URLs ของ Supabase */
export function authCallbackUrl(origin: string, next?: string | null, mode?: 'link'): string {
  const url = `${origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`
  return mode ? `${url}&mode=${mode}` : url
}

/** ข้อความ error ที่ Supabase/แพลตฟอร์มส่งกลับมา (อยู่ได้ทั้งใน query และ hash) — ไม่มีคืน null */
export function callbackError(search: string, hash: string): string | null {
  for (const raw of [search, hash]) {
    const params = new URLSearchParams(raw.replace(/^[?#]/, ''))
    const code = params.get('error')
    if (code) return params.get('error_description') || code
  }
  return null
}

/** ยกเลิกการเชื่อมได้เมื่อยังเหลือวิธีล็อกอินอื่นอย่างน้อย 1 ทาง — ไม่งั้นผู้ใช้จะเข้าบัญชีไม่ได้อีก */
export function canUnlinkIdentity(identities: readonly { provider: string }[]): boolean {
  return identities.length > 1
}

const PROVIDER_LABEL: Record<string, string> = {
  discord: 'Discord',
  google: 'Google',
  email: 'อีเมล',
}

export function providerLabel(provider: string): string {
  return PROVIDER_LABEL[provider] ?? provider
}

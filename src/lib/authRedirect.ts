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

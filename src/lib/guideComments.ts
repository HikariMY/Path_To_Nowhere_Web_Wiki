// ============================================================
// คอมเมนต์ใต้ไกด์ — logic ล้วน (สิทธิ์จริงอยู่ที่ RLS ใน supabase_migration_guide_comments.sql
// ฟังก์ชันพวกนี้ใช้ตัดสินแค่ว่าจะโชว์ปุ่มไหน)
// ============================================================

/** ความยาวสูงสุด — ต้องตรงกับ check constraint ของ guide_comments.content */
export const COMMENT_MAX = 1000

/** ข้อความ error ภาษาไทย หรือ null ถ้าส่งได้ */
export function validateComment(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return 'พิมพ์คอมเมนต์ก่อนส่ง'
  if (trimmed.length > COMMENT_MAX) return `คอมเมนต์ยาวได้ไม่เกิน ${COMMENT_MAX} ตัวอักษร`
  return null
}

interface OwnedComment {
  author_id: string
}

/** แก้ได้เฉพาะเจ้าของ (ทีมงานแก้คำพูดคนอื่นไม่ได้ — ลบได้อย่างเดียว) */
export function canEditComment(comment: OwnedComment, userId: string | null | undefined): boolean {
  return Boolean(userId) && comment.author_id === userId
}

/** ลบได้ทั้งเจ้าของและทีมงาน */
export function canDeleteComment(comment: OwnedComment, userId: string | null | undefined, isStaff: boolean): boolean {
  return Boolean(userId) && (comment.author_id === userId || isStaff)
}

// ============================================================
// ตัวละครโปรด — logic ล้วน (hook useFavorites ใช้ตอนกดหัวใจ และตอนย้อนกลับเมื่อบันทึกไม่ผ่าน)
// ============================================================

/** สลับสถานะชอบ/ไม่ชอบ คืน Set ใหม่เสมอ — added บอกว่ากดแล้วกลายเป็น "ชอบ" หรือไม่ */
export function toggleFavorite(
  ids: ReadonlySet<string>,
  characterId: string,
): { next: Set<string>; added: boolean } {
  const next = new Set(ids)
  const added = !next.has(characterId)
  if (added) next.add(characterId)
  else next.delete(characterId)
  return { next, added }
}

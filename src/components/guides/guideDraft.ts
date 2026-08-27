import type { CharacterGuideRow, GuideSection } from '../../types/database.types'

/**
 * รูปแบบข้อมูลระหว่างกรอกฟอร์ม — ทุกช่องเป็น string/array เพื่อผูกกับ input ได้ตรง ๆ
 * แล้วค่อยแปลงเป็น null ตอนบันทึกลง DB
 *
 * แยกออกมาจาก GuideEditor.tsx เพราะไฟล์ component ควร export แต่ component
 * ไม่งั้น hot reload ของ vite จะทำงานไม่เต็มที่
 */
export type GuideDraft = {
  title: string
  patch_version: string
  tags: string[]
  skill_priority: string[]
  level_from: string
  level_to: string
  notable_shackles: number[]
  recommended_ecb_id: string
  recommended_team: string[]
  sections: GuideSection[]
}

export type EcbOption = { id: string; name: string }
export type CharOption = { id: string; name: string; portrait_url: string | null }

export function blankDraft(): GuideDraft {
  return {
    title: '', patch_version: '', tags: [],
    skill_priority: [], level_from: '', level_to: '',
    notable_shackles: [], recommended_ecb_id: '', recommended_team: [],
    sections: [{ heading: 'ภาพรวม', body: '' }],
  }
}

export function draftFromGuide(g: CharacterGuideRow): GuideDraft {
  return {
    title: g.title,
    patch_version: g.patch_version || '',
    tags: g.tags || [],
    skill_priority: g.skill_priority || [],
    level_from: g.level_from || '',
    level_to: g.level_to || '',
    notable_shackles: g.notable_shackles || [],
    recommended_ecb_id: g.recommended_ecb_id || '',
    recommended_team: g.recommended_team || [],
    sections: g.sections?.length ? g.sections : [{ heading: 'ภาพรวม', body: '' }],
  }
}

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
  reforge_nodes: string[]   // id โหนด Reforge ที่แนบ
  reforge_ex: string        // character id เจ้าของ EX ('' = ไม่ระบุ)
  sections: GuideSection[]
}

/** อ่าน reforge_build แบบหลวม ๆ สำหรับฟอร์ม — การกรองกับต้นไม้จริงทำตอนแสดงผล (parseGuideBuild) */
function draftBuildFrom(raw: unknown): { nodes: string[]; ex: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { nodes: [], ex: '' }
  const b = raw as { nodes?: unknown; ex?: unknown }
  return {
    nodes: Array.isArray(b.nodes) ? b.nodes.filter((x): x is string => typeof x === 'string') : [],
    ex: typeof b.ex === 'string' ? b.ex : '',
  }
}

export type EcbOption = { id: string; name: string }
export type CharOption = { id: string; name: string; portrait_url: string | null }

export function blankDraft(): GuideDraft {
  return {
    title: '', patch_version: '', tags: [],
    skill_priority: [], level_from: '', level_to: '',
    notable_shackles: [], recommended_ecb_id: '', recommended_team: [],
    reforge_nodes: [], reforge_ex: '',
    sections: [{ heading: 'ภาพรวม', body: '' }],
  }
}

export function draftFromGuide(g: CharacterGuideRow): GuideDraft {
  const build = draftBuildFrom(g.reforge_build)
  return {
    reforge_nodes: build.nodes,
    reforge_ex: build.ex,
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

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { listExAnchors, type ExAnchorOption } from '../lib/reforge'
import { useToast } from '../components/ui/Toast'

/**
 * Overlimit Anchor (EX) ทุกตัวในระบบ (ใส่ได้ทุกตัวเหมือนในเกม) — โหลดจากตัวละครที่มีข้อมูล Reforge
 * enabled = false ไม่ยิง query (เช่นตัวละครที่ไม่มี Reforge)
 */
export function useExAnchorOptions(jobClass: string, enabled = true): ExAnchorOption[] {
  const { toast } = useToast()
  const [options, setOptions] = useState<ExAnchorOption[]>([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    supabase
      .from('characters')
      .select('id,name,reforge')
      .not('reforge', 'is', null)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          toast('โหลดรายการ Overlimit Anchor ไม่สำเร็จ', 'error')
          return
        }
        setOptions(listExAnchors(data ?? [], jobClass))
      })
    return () => { cancelled = true }
  }, [jobClass, enabled, toast])

  return options
}

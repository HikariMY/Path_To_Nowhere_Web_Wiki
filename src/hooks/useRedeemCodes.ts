import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pickEndingEvent, visibleCodes } from '../lib/redeemCodes'
import { useToast } from '../components/ui/Toast'
import type { RedeemCodeRow, SiteStatusRow } from '../types'

// ก่อนรัน supabase_migration_redeem_codes.sql ตารางยังไม่มี → query คืน error
// ถือว่า "ไม่มีโค้ด / ปิดแถบ" แล้วไม่แสดงอะไร หน้าเว็บส่วนอื่นทำงานต่อได้ตามปกติ

/** โค้ดที่เปิดอยู่และยังไม่หมดอายุ — null = กำลังโหลด */
export function useRedeemCodes(): RedeemCodeRow[] | null {
  const [codes, setCodes] = useState<RedeemCodeRow[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchCodes().then(rows => { if (!cancelled) setCodes(rows) })
    return () => { cancelled = true }
  }, [])
  return codes
}

async function fetchCodes(): Promise<RedeemCodeRow[]> {
  const { data, error } = await supabase
    .from('redeem_codes').select('*').eq('is_active', true).order('sort_order').order('created_at')
  if (error || !data) return []
  return visibleCodes(data as RedeemCodeRow[])
}

export type EndingEvent = { id: string; title: string; start_date: string | null; end_date: string | null }

export interface StatusBarData {
  status: SiteStatusRow
  codes: RedeemCodeRow[]
  event: EndingEvent | null
}

/** ข้อมูลแถบสถานะใต้เมนู — null = ยังโหลด / ปิดไว้ / ยังไม่รัน migration */
export function useStatusBar(): StatusBarData | null {
  const [data, setData] = useState<StatusBarData | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: status, error } = await supabase.from('site_status').select('*').eq('id', 1).maybeSingle()
      if (cancelled || error || !status || !status.show_bar) return
      const [codes, events] = await Promise.all([
        fetchCodes(),
        status.show_event ? fetchEndingEvents() : Promise.resolve([]),
      ])
      if (!cancelled) setData({ status: status as SiteStatusRow, codes, event: pickEndingEvent(events) })
    })()
    return () => { cancelled = true }
  }, [])
  return data
}

async function fetchEndingEvents(): Promise<EndingEvent[]> {
  const { data } = await supabase
    .from('events').select('id, title, start_date, end_date')
    .eq('is_active', true).gt('end_date', new Date().toISOString())
    .order('end_date').limit(20)
  return (data || []) as EndingEvent[]
}

/** คัดลอกโค้ดแล้วแจ้งผล — บางเบราว์เซอร์ (http / iframe) ไม่ให้ใช้ clipboard */
export function useCopyCode(): (code: string) => Promise<void> {
  const { toast } = useToast()
  return useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast(`คัดลอก ${code} แล้ว`, 'success')
    } catch {
      toast('คัดลอกไม่ได้ — กดค้างที่โค้ดแล้วคัดลอกเอง', 'error')
    }
  }, [toast])
}

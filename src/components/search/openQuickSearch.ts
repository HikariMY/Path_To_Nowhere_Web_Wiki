// แยกไฟล์จาก QuickSearch.tsx — ไฟล์คอมโพเนนต์ควร export แต่คอมโพเนนต์ (React Fast Refresh)
export const QUICK_SEARCH_OPEN_EVENT = 'quick-search:open'

/** เปิดค้นหาด่วนจากที่อื่น เช่น เมนูมือถือ */
export function openQuickSearch(): void {
  window.dispatchEvent(new Event(QUICK_SEARCH_OPEN_EVENT))
}

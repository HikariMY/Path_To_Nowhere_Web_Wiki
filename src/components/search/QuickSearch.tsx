import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { SearchPalette } from './SearchPalette'
import { QUICK_SEARCH_OPEN_EVENT as OPEN_EVENT } from './openQuickSearch'

/** กำลังพิมพ์อยู่ในช่องกรอก — ปุ่ม "/" ต้องพิมพ์ได้ตามปกติ */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)
}

function isLongTextField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * ปุ่มค้นหาในแถบเมนู + คีย์ลัด Ctrl/⌘+K หรือ "/" เปิดค้นหาด่วนได้จากทุกหน้า
 * ปุ่มโชว์เฉพาะจอ lg ขึ้นไป — จอเล็กกว่านั้นแถบเมนูเต็มแล้ว (มือถือเปิดจากเมนู ☰ แทน)
 */
export function QuickSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ในช่องข้อความยาว (เช่น ตัวแก้ไขฟอรัม) Ctrl+K มักเป็นคีย์ใส่ลิงก์ — ปล่อยให้ทำงานตามเดิม
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !isLongTextField(e.target)) {
        e.preventDefault()
        setOpen(v => !v)
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="ค้นหา (Ctrl+K)"
        aria-label="ค้นหา"
        aria-haspopup="dialog"
        className="hidden items-center gap-2 rounded p-2 text-ptn-muted transition-colors hover:bg-ptn-elevated hover:text-ptn-text lg:flex"
      >
        <Search size={16} />
        <kbd className="hidden rounded border border-ptn-border px-1.5 py-0.5 font-mono text-[10px] xl:block">Ctrl K</kbd>
      </button>
      {open && <SearchPalette onClose={() => setOpen(false)} />}
    </>
  )
}

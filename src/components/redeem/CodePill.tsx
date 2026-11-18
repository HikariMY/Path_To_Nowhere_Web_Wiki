/** ปุ่มโค้ดเล็ก ๆ กดแล้วคัดลอก (ใช้ในแถบสถานะ) */
export function CodePill({ code, onCopy }: { code: string; onCopy: (code: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(code)}
      title="กดเพื่อคัดลอก"
      aria-label={`คัดลอกโค้ด ${code}`}
      className="rounded border border-dashed border-ptn-gold/50 px-1.5 py-px font-mono text-[11px] font-semibold text-ptn-gold transition-colors hover:bg-ptn-gold/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ptn-gold"
    >
      {code}
    </button>
  )
}

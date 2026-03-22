import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-ptn-border bg-ptn-surface mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-ptn-red">
              <Shield size={12} className="text-white" />
            </div>
            <span className="font-heading font-bold text-ptn-text">
              PTN <span className="text-ptn-red">WIKI TH</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-ptn-muted">
            <Link to="/" className="hover:text-ptn-text transition-colors">หน้าแรก</Link>
            <Link to="/characters" className="hover:text-ptn-text transition-colors">ตัวละคร</Link>
            <Link to="/tier-lists" className="hover:text-ptn-text transition-colors">เทียร์ลิสต์</Link>
            <Link to="/forum" className="hover:text-ptn-text transition-colors">ฟอรัม</Link>
          </div>

          <p className="text-xs text-ptn-disabled text-center">
            © 2025 PTN Wiki TH — แฟนเมดเว็บไซต์ ไม่เกี่ยวข้องกับ Ik4rUs / Kuro Games
          </p>
        </div>
      </div>
    </footer>
  )
}

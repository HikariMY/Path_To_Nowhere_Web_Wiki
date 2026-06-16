import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Sword, Calendar, MessageSquare,
  FileText, Shield, ChevronRight, Megaphone, BookOpen, Gem, ArrowLeft, BarChart3, Pin,
} from 'lucide-react'
import { cn } from '../../lib/utils'

const adminNav = [
  { to: '/admin',               label: 'แดชบอร์ด',       icon: LayoutDashboard, exact: true },
  { to: '/admin/users',         label: 'จัดการสมาชิก',    icon: Users,           exact: false },
  { to: '/admin/characters',    label: 'จัดการตัวละคร & สกิล', icon: Sword,       exact: false },
  { to: '/admin/crimebrands',        label: 'จัดการ Crimebrands',       icon: Gem,        exact: false },
  { to: '/admin/game-info',     label: 'ข้อมูลเกม',          icon: BookOpen,        exact: false },
  { to: '/admin/events',        label: 'จัดการอีเวนต์',   icon: Calendar,        exact: false },
  { to: '/admin/announcements', label: 'ข่าวสาร/ประกาศ',  icon: Megaphone,       exact: false },
  { to: '/admin/forum',         label: 'จัดการฟอรัม',     icon: MessageSquare,   exact: false },
  { to: '/admin/posts',         label: 'จัดการโพสต์',      icon: Pin,             exact: false },
  { to: '/admin/tier-lists',    label: 'จัดการ Tier Lists', icon: BarChart3,       exact: false },
  { to: '/admin/logs',          label: 'บันทึกกิจกรรม',   icon: FileText,        exact: false },
]

export function AdminLayout() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen bg-ptn-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-ptn-border bg-ptn-surface shrink-0">
        <div className="flex items-center gap-2 p-4 border-b border-ptn-border">
          <img src="/web-logo.png" alt="Project Duck" className="h-6 w-auto object-contain" />
          <span className="font-heading font-bold text-ptn-text text-sm">Admin Panel</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {adminNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                isActive
                  ? 'bg-ptn-red/10 text-ptn-red border border-ptn-red/20'
                  : 'text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated',
              )}
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-ptn-border">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs text-ptn-muted hover:text-ptn-text transition-colors"
          >
            <ChevronRight size={12} className="rotate-180" />
            กลับหน้าหลัก
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile admin nav */}
        <div className="md:hidden flex overflow-x-auto border-b border-ptn-border bg-ptn-surface px-2 py-2 gap-1">
          {adminNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-ptn-red/10 text-ptn-red'
                  : 'text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated',
              )}
            >
              <item.icon size={13} />
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Top bar with back button */}
        <div className="hidden md:flex items-center gap-2 px-6 py-3 border-b border-ptn-border bg-ptn-surface/50">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text transition-colors"
          >
            <ArrowLeft size={15} /> ย้อนกลับ
          </button>
          <span className="text-ptn-border">|</span>
          <Link to="/" className="text-sm text-ptn-muted hover:text-ptn-cyan transition-colors">
            กลับหน้าเว็บ
          </Link>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

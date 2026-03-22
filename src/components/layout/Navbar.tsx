import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Shield, LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

const navLinks = [
  { to: '/',           label: 'หน้าแรก',    exact: true },
  { to: '/characters', label: 'ตัวละคร',    exact: false },
  { to: '/tier-lists', label: 'เทียร์ลิสต์', exact: false },
  { to: '/forum',      label: 'ฟอรัม',       exact: false },
]

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ptn-border bg-ptn-bg/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-ptn-red">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-ptn-text tracking-wide">
              PTN <span className="text-ptn-red">WIKI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) => cn(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'text-ptn-text bg-ptn-elevated'
                    : 'text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated',
                )}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && profile ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-ptn-elevated transition-colors"
                >
                  <Avatar src={profile.avatar_url} username={profile.username} size="sm" />
                  <span className="hidden sm:block text-sm text-ptn-text max-w-[120px] truncate">
                    {profile.username}
                  </span>
                  <ChevronDown size={14} className="text-ptn-muted hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-ptn-border bg-ptn-surface shadow-ptn-card z-20">
                      <div className="p-3 border-b border-ptn-border">
                        <p className="text-sm font-medium text-ptn-text truncate">{profile.username}</p>
                        <p className="text-xs text-ptn-muted capitalize">{profile.role}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          to={`/profile/${profile.username}`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated rounded transition-colors"
                        >
                          <User size={14} /> โปรไฟล์
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated rounded transition-colors"
                        >
                          <Settings size={14} /> ตั้งค่าบัญชี
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated rounded transition-colors"
                          >
                            <Settings size={14} /> แผงผู้ดูแล
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        >
                          <LogOut size={14} /> ออกจากระบบ
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  เข้าสู่ระบบ
                </Button>
                <Button size="sm" onClick={() => navigate('/register')} className="hidden sm:flex">
                  สมัครสมาชิก
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-2 text-ptn-muted hover:text-ptn-text"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-ptn-border bg-ptn-surface px-4 py-3">
          <nav className="flex flex-col gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn(
                  'px-3 py-2 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'text-ptn-text bg-ptn-elevated'
                    : 'text-ptn-muted hover:text-ptn-text',
                )}
              >
                {link.label}
              </NavLink>
            ))}
            {!user && (
              <div className="flex gap-2 mt-2 pt-2 border-t border-ptn-border">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate('/login'); setMobileOpen(false) }}>
                  เข้าสู่ระบบ
                </Button>
                <Button size="sm" className="flex-1" onClick={() => { navigate('/register'); setMobileOpen(false) }}>
                  สมัครสมาชิก
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

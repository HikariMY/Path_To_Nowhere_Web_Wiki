import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Pin, Users, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ForumCategory } from '../../types'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'

const DEMO_CATEGORIES: ForumCategory[] = [
  { id:'1', name:'ทั่วไป', slug:'general', description:'พูดคุยทั่วไปเกี่ยวกับ Path to Nowhere', icon:'MessageSquare', color:'#60A5FA', sort_order:1, post_count:42, is_locked:false, created_at:'' },
  { id:'2', name:'กลยุทธ์และแนะนำ', slug:'strategy', description:'แชร์เทคนิคการเล่น บิลด์ตัวละคร และแนะนำด่านต่างๆ', icon:'Swords', color:'#C8102E', sort_order:2, post_count:28, is_locked:false, created_at:'' },
  { id:'3', name:'ตัวละคร', slug:'characters', description:'พูดคุยเกี่ยวกับตัวละครแต่ละตัว ทักษะ และการใช้งาน', icon:'Users', color:'#C084FC', sort_order:3, post_count:65, is_locked:false, created_at:'' },
  { id:'4', name:'อีเวนต์', slug:'events', description:'ข้อมูลและแนะนำอีเวนต์ปัจจุบันและที่กำลังจะมา', icon:'Calendar', color:'#F59E0B', sort_order:4, post_count:15, is_locked:false, created_at:'' },
  { id:'5', name:'สื่อและผลงาน', slug:'media', description:'แชร์ภาพ วิดีโอ และผลงานแฟนอาร์ต', icon:'Image', color:'#10B981', sort_order:5, post_count:33, is_locked:false, created_at:'' },
  { id:'6', name:'รายงานบัก', slug:'bug', description:'แจ้งปัญหาและข้อบกพร่องในเกม', icon:'Bug', color:'#9898B0', sort_order:6, post_count:8, is_locked:false, created_at:'' },
]

const CATEGORY_ICONS: Record<string, string> = {
  MessageSquare: '💬',
  Swords:        '⚔️',
  Users:         '👥',
  Calendar:      '📅',
  Image:         '🖼️',
  Bug:           '🐛',
  ArrowLeftRight:'🔄',
}

export function ForumPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order')
      setCategories(data && data.length > 0 ? data : DEMO_CATEGORIES)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-ptn-text flex items-center gap-3">
          <MessageSquare size={28} className="text-green-400" />
          ฟอรัมชุมชน
        </h1>
        <p className="text-ptn-muted mt-1">พื้นที่พูดคุยสำหรับชุมชน PTN Wiki TH</p>
      </div>

      <div className="space-y-3">
        {categories.map(cat => (
          <Link key={cat.id} to={`/forum/${cat.slug}`}>
            <Card hover className="p-5">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
                  style={{
                    background: `${cat.color || '#60A5FA'}15`,
                    borderColor: `${cat.color || '#60A5FA'}30`,
                  }}
                >
                  {CATEGORY_ICONS[cat.icon || ''] || '💬'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-semibold text-ptn-text">{cat.name}</h2>
                    {cat.is_locked && (
                      <Pin size={12} className="text-ptn-muted" />
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-sm text-ptn-muted mt-0.5 truncate">{cat.description}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="shrink-0 flex items-center gap-3 text-xs text-ptn-muted">
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    <span>{cat.post_count} กระทู้</span>
                  </div>
                  <ChevronRight size={14} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

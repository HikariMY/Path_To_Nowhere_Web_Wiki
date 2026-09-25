import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Plus, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { RARITY_COLORS } from '../../lib/constants'
import { parseMembers, type TeamMember } from '../../lib/team'
import { formatRelativeTime } from '../../lib/utils'
import type { Character } from '../../types'

const LIST_LIMIT = 50

type Portrait = Pick<Character, 'id' | 'name' | 'portrait_url' | 'rarity'>

interface TeamListItem {
  id: string
  title: string
  is_public: boolean
  updated_at: string
  members: TeamMember[]
  author: { username: string; display_name: string | null } | null
}

async function loadTeams(mineOf: string | null): Promise<{ teams: TeamListItem[]; portraits: Map<string, Portrait> }> {
  const base = supabase
    .from('teams')
    .select('id, title, is_public, updated_at, members, author:profiles(username, display_name)')
    .order('updated_at', { ascending: false })
    .limit(LIST_LIMIT)
  const [teamsRes, charsRes] = await Promise.all([
    mineOf ? base.eq('author_id', mineOf) : base.eq('is_public', true),
    supabase.from('characters').select('id, name, portrait_url, rarity'),
  ])
  if (teamsRes.error) throw teamsRes.error
  if (charsRes.error) throw charsRes.error
  return {
    teams: (teamsRes.data ?? []).map(t => ({
      ...t,
      members: parseMembers(t.members),
      author: Array.isArray(t.author) ? t.author[0] ?? null : t.author,
    })),
    portraits: new Map((charsRes.data ?? []).map(c => [c.id, c as Portrait])),
  }
}

/** รวมทีมที่ผู้เล่นจัดไว้ — ทีมสาธารณะล่าสุด หรือเฉพาะทีมของตัวเอง (รวมทีมส่วนตัว) */
export function TeamsPage() {
  const { user } = useAuth()
  const [mineOnly, setMineOnly] = useState(false)
  const [state, setState] = useState<Awaited<ReturnType<typeof loadTeams>> | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const mineOf = mineOnly && user ? user.id : null

  useEffect(() => {
    let active = true
    loadTeams(mineOf)
      .then(data => { if (active) { setState(data); setFailed(false) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [mineOf, reloadKey])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-ptn-text">
            <Users size={22} className="text-ptn-cyan" /> ทีม
          </h1>
          <p className="text-sm text-ptn-muted">จัดทีม 6 ตัว เลือก Crimebrand แล้วแชร์ให้เพื่อนดู</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user && (
            <Button variant={mineOnly ? 'primary' : 'outline'} size="sm" aria-pressed={mineOnly}
              onClick={() => setMineOnly(v => !v)}>
              ทีมของฉัน
            </Button>
          )}
          <Link to="/teams/new"><Button size="sm"><Plus size={14} /> จัดทีมใหม่</Button></Link>
        </div>
      </div>

      {failed ? (
        <Card className="p-6 text-center text-sm text-ptn-muted">
          โหลดทีมไม่สำเร็จ
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => { setFailed(false); setReloadKey(k => k + 1) }}>ลองใหม่</Button>
          </div>
        </Card>
      ) : !state ? (
        <PageLoader />
      ) : state.teams.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ptn-muted">
          {mineOnly ? 'คุณยังไม่ได้จัดทีม' : 'ยังไม่มีใครแชร์ทีม — เป็นคนแรกเลย'}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.teams.map(team => (
            <Link key={team.id} to={`/teams/${team.id}`}>
              <Card hover className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate font-medium text-ptn-text">{team.title}</h2>
                  {!team.is_public && <Lock size={13} className="shrink-0 text-ptn-muted" aria-label="ทีมส่วนตัว" />}
                </div>
                <div className="flex gap-1">
                  {team.members.map(m => {
                    const char = state.portraits.get(m.character_id)
                    return (
                      <div
                        key={m.character_id}
                        title={char?.name}
                        className="h-12 w-10 shrink-0 overflow-hidden rounded border bg-ptn-elevated"
                        style={{ borderColor: `${RARITY_COLORS[char?.rarity ?? ''] ?? '#888'}80` }}
                      >
                        {char?.portrait_url && (
                          <img src={char.portrait_url} alt={char.name} className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-ptn-muted">
                  {team.author?.display_name || team.author?.username || 'ไม่ทราบ'} · {formatRelativeTime(team.updated_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

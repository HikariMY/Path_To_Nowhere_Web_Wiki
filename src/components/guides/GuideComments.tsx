import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../ui/Toast'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Textarea } from '../ui/Textarea'
import { ReportButton } from '../moderation/ReportButton'
import { COMMENT_MAX, canDeleteComment, canEditComment, validateComment } from '../../lib/guideComments'
import { describeWriteError } from '../../lib/moderation'
import { formatRelativeTime } from '../../lib/utils'
import type { GuideCommentRow } from '../../types/database.types'
import type { Profile } from '../../types'

type CommentView = GuideCommentRow & {
  author: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null
}

const MAX_SHOWN = 200

/** คอมเมนต์ใต้ไกด์ — ทุกคนอ่านได้ ล็อกอินแล้วคอมเมนต์ได้ */
export function GuideComments({ guideId }: { guideId: string }) {
  const { user, isModerator } = useAuth()
  const { toast } = useToast()
  const location = useLocation()
  const [comments, setComments] = useState<CommentView[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('guide_comments')
      .select('*, author:profiles(username, display_name, avatar_url)')
      .eq('guide_id', guideId)
      // เอา MAX_SHOWN อันล่าสุด (ไม่งั้นพอเกินจำนวนนี้ คอมเมนต์ใหม่จะไม่โผล่) แล้วกลับให้เก่า → ใหม่
      .order('created_at', { ascending: false })
      .limit(MAX_SHOWN)
      .then(({ data, error }) => {
        if (!active) return
        if (error) { setFailed(true); return }
        setFailed(false)
        setComments((data ?? [])
          .map(c => ({ ...c, author: Array.isArray(c.author) ? c.author[0] ?? null : c.author }))
          .reverse())
      })
    return () => { active = false }
  }, [guideId, reloadKey])

  const reload = () => setReloadKey(k => k + 1)

  const handlePost = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const problem = validateComment(draft)
    if (problem) { toast(problem, 'error'); return }
    setPosting(true)
    const { error } = await supabase.from('guide_comments').insert({ guide_id: guideId, author_id: user.id, content: draft.trim() })
    setPosting(false)
    if (error) {
      toast(describeWriteError(error, 'ส่งคอมเมนต์ไม่สำเร็จ', { missingParent: 'ไกด์นี้ถูกลบไปแล้ว' }), 'error')
      return
    }
    setDraft('')
    reload()
  }

  const handleSaveEdit = async () => {
    if (!editing || savingEdit) return
    const problem = validateComment(editing.text)
    if (problem) { toast(problem, 'error'); return }
    setSavingEdit(true)
    const { error } = await supabase.from('guide_comments').update({ content: editing.text.trim() }).eq('id', editing.id)
    setSavingEdit(false)
    if (error) { toast(describeWriteError(error, 'แก้คอมเมนต์ไม่สำเร็จ'), 'error'); return }
    setEditing(null)
    reload()
  }

  const handleDelete = async (comment: CommentView) => {
    if (!confirm('ลบคอมเมนต์นี้?')) return
    const { error } = await supabase.from('guide_comments').delete().eq('id', comment.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    setComments(prev => prev?.filter(c => c.id !== comment.id) ?? prev)
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-ptn-text">
        <MessageSquare size={15} className="text-ptn-cyan" />
        คอมเมนต์ {comments ? `(${comments.length})` : ''}
      </h3>

      {failed ? (
        <p className="text-sm text-ptn-muted">
          โหลดคอมเมนต์ไม่สำเร็จ <button onClick={reload} className="text-ptn-cyan hover:underline">ลองใหม่</button>
        </p>
      ) : comments === null ? (
        <p className="text-sm text-ptn-muted">กำลังโหลด...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-ptn-muted">ยังไม่มีคอมเมนต์ — ถามหรือเสริมไกด์นี้ได้เลย</p>
      ) : (
        <ul className="mb-4 space-y-3">
          {comments.map(c => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar src={c.author?.avatar_url ?? null} username={c.author?.username ?? '?'} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-ptn-muted">
                  {c.author ? (
                    <Link to={`/profile/${c.author.username}`} className="font-medium text-ptn-text hover:text-ptn-cyan">
                      {c.author.display_name || c.author.username}
                    </Link>
                  ) : <span>ไม่ทราบ</span>}
                  <span>{formatRelativeTime(c.created_at)}{c.updated_at !== c.created_at && ' (แก้ไขแล้ว)'}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {canEditComment(c, user?.id) && editing?.id !== c.id && (
                      <button onClick={() => setEditing({ id: c.id, text: c.content })} aria-label="แก้คอมเมนต์"
                        className="hover:text-ptn-cyan"><Pencil size={12} /></button>
                    )}
                    {canDeleteComment(c, user?.id, isModerator) && (
                      <button onClick={() => handleDelete(c)} aria-label="ลบคอมเมนต์"
                        className="hover:text-ptn-red"><Trash2 size={12} /></button>
                    )}
                    <ReportButton targetType="guide_comment" targetId={c.id} authorId={c.author_id} />
                  </span>
                </div>
                {editing?.id === c.id ? (
                  <div className="mt-1 space-y-2">
                    <Textarea
                      value={editing.text}
                      onChange={e => setEditing({ id: c.id, text: e.target.value })}
                      maxLength={COMMENT_MAX}
                      rows={3}
                      aria-label="แก้ข้อความคอมเมนต์"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>ยกเลิก</Button>
                      <Button size="sm" onClick={handleSaveEdit} loading={savingEdit}>บันทึก</Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ptn-text">{c.content}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form onSubmit={handlePost} className="space-y-2">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={2}
            placeholder="เขียนคอมเมนต์..."
            aria-label="เขียนคอมเมนต์"
          />
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-ptn-disabled">{draft.trim().length}/{COMMENT_MAX}</span>
            <Button type="submit" size="sm" loading={posting} disabled={!draft.trim()}>ส่งคอมเมนต์</Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ptn-muted">
          <Link to="/login" state={{ from: location }} className="text-ptn-cyan hover:underline">เข้าสู่ระบบ</Link> เพื่อคอมเมนต์
        </p>
      )}
    </Card>
  )
}

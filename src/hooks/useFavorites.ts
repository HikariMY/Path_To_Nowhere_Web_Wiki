import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { toggleFavorite } from '../lib/favorites'
import { describeWriteError } from '../lib/moderation'

const EMPTY: ReadonlySet<string> = new Set()

export interface FavoritesState {
  /** ล็อกอินอยู่ (กดหัวใจได้) */
  enabled: boolean
  ids: ReadonlySet<string>
  isFavorite: (characterId: string) => boolean
  toggle: (characterId: string) => Promise<void>
}

/**
 * ตัวละครโปรดของผู้ใช้ที่ล็อกอินอยู่
 * กดแล้วเปลี่ยนบนจอทันที บันทึกไม่ผ่านค่อยย้อนกลับ · ยังไม่ล็อกอิน → พาไปหน้าเข้าสู่ระบบแล้วกลับมาที่เดิม
 */
export function useFavorites(): FavoritesState {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  // ผูกกับ userId — เปลี่ยนบัญชีแล้วไม่เอารายการของคนเก่ามาโชว์
  const [loaded, setLoaded] = useState<{ userId: string; ids: Set<string> } | null>(null)
  const pending = useRef(new Set<string>())

  // ผูกกับ id ไม่ใช่ object user — ต่ออายุ token ได้ user object ใหม่ทุกครั้ง ถ้าโหลดซ้ำตอนนั้น
  // ผลที่ได้อาจทับหัวใจที่เพิ่งกด (ก่อนบันทึกเสร็จ) แล้วหายไปเงียบ ๆ
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let active = true
    supabase.from('favorite_characters').select('character_id').eq('user_id', userId)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          toast('โหลดตัวละครโปรดไม่สำเร็จ ลองรีเฟรชหน้า', 'error')
          return
        }
        setLoaded({ userId, ids: new Set(data.map(r => r.character_id)) })
      })
    return () => { active = false }
  }, [userId, toast])

  const ids = user && loaded?.userId === user.id ? loaded.ids : EMPTY

  const flip = useCallback((userId: string, characterId: string) => {
    setLoaded(prev => {
      const base = prev?.userId === userId ? prev.ids : new Set<string>()
      return { userId, ids: toggleFavorite(base, characterId).next }
    })
  }, [])

  const toggle = useCallback(async (characterId: string) => {
    if (!user) {
      toast('เข้าสู่ระบบก่อนเพื่อเก็บตัวละครโปรด', 'info')
      navigate('/login', { state: { from: location } })
      return
    }
    if (pending.current.has(characterId)) return
    pending.current.add(characterId)

    const adding = !ids.has(characterId)
    flip(user.id, characterId)
    const { error } = adding
      ? await supabase.from('favorite_characters').insert({ user_id: user.id, character_id: characterId })
      : await supabase.from('favorite_characters').delete().eq('user_id', user.id).eq('character_id', characterId)
    pending.current.delete(characterId)

    // 23505 = ชอบไว้อยู่แล้ว (เช่นกดจากอีกแท็บ) — ผลลัพธ์ตรงกับที่ต้องการ ไม่ต้องย้อน
    if (error && !(adding && error.code === '23505')) {
      flip(user.id, characterId)
      toast(describeWriteError(error, 'บันทึกตัวละครโปรดไม่สำเร็จ'), 'error')
    }
  }, [user, ids, flip, toast, navigate, location])

  const isFavorite = useCallback((characterId: string) => ids.has(characterId), [ids])

  return { enabled: Boolean(user), ids, isFavorite, toggle }
}

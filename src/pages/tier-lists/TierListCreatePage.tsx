// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, TierRow } from '../../types'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { RARITY_COLORS, TIER_COLORS } from '../../lib/constants'
import { PageLoader } from '../../components/ui/Spinner'

export function TierListCreatePage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [patchVersion, setPatchVersion] = useState('')
  const [isOfficial, setIsOfficial] = useState(false)
  const [tiers, setTiers] = useState<TierRow[]>(
    TIER_COLORS.map(t => ({ label: t.label, color: t.color, character_ids: [] }))
  )
  const [characters, setCharacters] = useState<Character[]>([])
  const [unassigned, setUnassigned] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: chars } = await supabase.from('characters').select('*').order('rarity').order('name')
      const allChars = chars || []
      setCharacters(allChars)

      if (isEdit) {
        const { data: existing } = await supabase.from('tier_lists').select('*').eq('id', id).single()
        if (existing) {
          setTitle(existing.title)
          setDescription(existing.description || '')
          setPatchVersion(existing.patch_version || '')
          setIsOfficial(existing.is_official)
          const existingTiers = existing.tiers as TierRow[]
          setTiers(existingTiers)
          const assignedIds = existingTiers.flatMap(t => t.character_ids)
          setUnassigned(allChars.map(c => c.id).filter(cid => !assignedIds.includes(cid)))
        }
      } else {
        setUnassigned(allChars.map(c => c.id))
      }
      setInitLoading(false)
    }
    init()
  }, [id, isEdit])

  const charMap = Object.fromEntries(characters.map(c => [c.id, c]))

  const moveToTier = (charId: string, tierIndex: number) => {
    setTiers(prev => {
      const updated = prev.map(t => ({
        ...t,
        character_ids: t.character_ids.filter(id => id !== charId),
      }))
      if (tierIndex >= 0) {
        updated[tierIndex] = {
          ...updated[tierIndex],
          character_ids: [...updated[tierIndex].character_ids, charId],
        }
      }
      return updated
    })
    setUnassigned(prev => tierIndex >= 0
      ? prev.filter(id => id !== charId)
      : [...prev.filter(id => id !== charId), charId]
    )
  }

  const removeFromTier = (charId: string) => {
    setTiers(prev => prev.map(t => ({
      ...t,
      character_ids: t.character_ids.filter(id => id !== charId),
    })))
    setUnassigned(prev => [...prev, charId])
  }

  const handleSave = async () => {
    if (!title.trim()) { toast('กรุณากรอกชื่อเทียร์ลิสต์', 'error'); return }
    setLoading(true)

    const payload = {
      author_id: user!.id,
      title: title.trim(),
      description: description.trim() || null,
      patch_version: patchVersion.trim() || null,
      is_official: isAdmin && isOfficial,
      tiers,
      updated_at: new Date().toISOString(),
    }

    let error
    if (isEdit) {
      const res = await supabase.from('tier_lists').update(payload).eq('id', id)
      error = res.error
    } else {
      const res = await supabase.from('tier_lists').insert(payload as never).select('id').single()
      error = res.error
      if (!error && res.data) navigate(`/tier-lists/${(res.data as { id: string }).id}`)
    }

    setLoading(false)
    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      toast('บันทึกสำเร็จ!', 'success')
      if (isEdit) navigate(`/tier-lists/${id}`)
    }
  }

  if (initLoading) return <PageLoader />

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-6">
        {isEdit ? 'แก้ไขเทียร์ลิสต์' : 'สร้างเทียร์ลิสต์ใหม่'}
      </h1>

      {/* Meta */}
      <Card className="p-4 mb-6 grid sm:grid-cols-3 gap-4">
        <Input label="ชื่อเทียร์ลิสต์" value={title} onChange={e => setTitle(e.target.value)} placeholder="ชื่อเทียร์ลิสต์..." />
        <Input label="เวอร์ชัน Patch" value={patchVersion} onChange={e => setPatchVersion(e.target.value)} placeholder="เช่น 3.0" />
        {isAdmin && (
          <div className="flex flex-col gap-1 justify-end">
            <label className="text-sm font-medium text-ptn-muted">ประเภท</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={e => setIsOfficial(e.target.checked)}
                className="accent-ptn-red"
              />
              <span className="text-sm text-ptn-text">เทียร์ลิสต์ทางการ</span>
            </label>
          </div>
        )}
        <div className="sm:col-span-3">
          <Textarea label="คำอธิบาย (ไม่บังคับ)" value={description} onChange={e => setDescription(e.target.value)} placeholder="อธิบายเทียร์ลิสต์ของคุณ..." rows={2} />
        </div>
      </Card>

      {/* Tier Editor */}
      <div className="space-y-2 mb-6">
        {tiers.map((tier, tierIndex) => (
          <div key={tierIndex} className="flex items-stretch rounded-lg border border-ptn-border overflow-hidden">
            <div
              className="flex w-12 sm:w-16 items-center justify-center shrink-0 font-heading font-bold text-xl"
              style={{ background: `${tier.color}20`, color: tier.color, borderRight: `2px solid ${tier.color}40` }}
            >
              {tier.label}
            </div>
            <div
              className="flex flex-wrap gap-2 p-3 flex-1 bg-ptn-surface min-h-[80px]"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                if (dragging) moveToTier(dragging, tierIndex)
              }}
            >
              {tier.character_ids.map(cid => {
                const char = charMap[cid]
                if (!char) return null
                return (
                  <div
                    key={cid}
                    draggable
                    onDragStart={() => setDragging(cid)}
                    onDragEnd={() => setDragging(null)}
                    className="group relative flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing"
                  >
                    <div
                      className="w-12 h-14 rounded overflow-hidden border flex items-center justify-center bg-ptn-elevated relative"
                      style={{ borderColor: `${RARITY_COLORS[char.rarity]}60` }}
                    >
                      {char.portrait_url ? (
                        <img src={char.portrait_url} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-heading font-bold text-lg" style={{ color: RARITY_COLORS[char.rarity] }}>
                          {char.name[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-ptn-muted max-w-[50px] truncate">{char.name}</span>
                    <button
                      onClick={() => removeFromTier(cid)}
                      className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={8} className="text-white" />
                    </button>
                  </div>
                )
              })}
              {tier.character_ids.length === 0 && (
                <p className="text-xs text-ptn-disabled self-center">ลากตัวละครมาวางที่นี่</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned pool */}
      <Card className="p-4 mb-6">
        <h2 className="font-heading font-semibold text-ptn-text mb-3 flex items-center gap-2">
          <GripVertical size={15} className="text-ptn-muted" />
          ตัวละครที่ยังไม่ได้จัดอันดับ ({unassigned.length})
        </h2>
        <div
          className="flex flex-wrap gap-2 min-h-[80px]"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            if (dragging) removeFromTier(dragging)
          }}
        >
          {unassigned.map(cid => {
            const char = charMap[cid]
            if (!char) return null
            return (
              <div
                key={cid}
                draggable
                onDragStart={() => setDragging(cid)}
                onDragEnd={() => setDragging(null)}
                className="flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing"
              >
                <div
                  className="w-11 h-13 rounded overflow-hidden border flex items-center justify-center bg-ptn-elevated"
                  style={{ borderColor: `${RARITY_COLORS[char.rarity]}40` }}
                >
                  {char.portrait_url ? (
                    <img src={char.portrait_url} alt={char.name} className="w-11 h-13 object-cover" />
                  ) : (
                    <span className="font-heading font-bold" style={{ color: RARITY_COLORS[char.rarity] }}>
                      {char.name[0]}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-ptn-muted max-w-[44px] truncate">{char.name}</span>
              </div>
            )
          })}
          {unassigned.length === 0 && (
            <p className="text-xs text-ptn-disabled self-center">ตัวละครทั้งหมดถูกจัดอันดับแล้ว</p>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={loading} size="lg">
          <Save size={16} /> บันทึก
        </Button>
        <Button variant="ghost" onClick={() => navigate('/tier-lists')}>
          ยกเลิก
        </Button>
      </div>
    </div>
  )
}

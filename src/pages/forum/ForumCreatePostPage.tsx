// @ts-nocheck
import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { ForumCategory } from '../../types'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { MultiImageUpload } from '../../components/ui/MultiImageUpload'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'

export function ForumCreatePostPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('is_locked', false)
        .order('sort_order')
      if (data) {
        setCategories(data)
        if (categorySlug) {
          const found = data.find(c => c.slug === categorySlug)
          if (found) setCategoryId(found.id)
        }
      }
    }
    fetchCategories()
  }, [categorySlug])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!categoryId) errs.category = 'กรุณาเลือกหมวดหมู่'
    if (!title.trim() || title.trim().length < 5) errs.title = 'ชื่อกระทู้ต้องมีอย่างน้อย 5 ตัวอักษร'
    if (!content.trim() || content.trim().length < 10) errs.content = 'เนื้อหาต้องมีอย่างน้อย 10 ตัวอักษร'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    const { data: newPost, error } = await supabase
      .from('forum_posts')
      .insert({
        category_id: categoryId,
        author_id: user!.id,
        title: title.trim(),
        content: content.trim(),
        image_urls: imageUrls,
      })
      .select('id, category:forum_categories(slug)')
      .single()

    setSubmitting(false)
    if (error || !newPost) {
      toast('เกิดข้อผิดพลาด: ' + (error?.message || 'ไม่ทราบสาเหตุ'), 'error')
    } else {
      toast('ตั้งกระทู้สำเร็จ!', 'success')
      const cat = newPost.category
      const catSlug = Array.isArray(cat) ? cat[0]?.slug : (cat as any)?.slug
      const slug = catSlug || categorySlug || 'general'
      navigate(`/forum/${slug}/${newPost.id}`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to={categorySlug ? `/forum/${categorySlug}` : '/forum'}
        className="flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text mb-6 w-fit"
      >
        <ChevronLeft size={16} /> กลับ
      </Link>

      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-6">ตั้งกระทู้ใหม่</h1>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="หมวดหมู่"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            error={errors.category}
          >
            <option value="">เลือกหมวดหมู่...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>

          <Input
            label="ชื่อกระทู้"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ชื่อกระทู้ของคุณ..."
            error={errors.title}
          />

          <Textarea
            label="เนื้อหา (รองรับ Markdown)"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="เขียนเนื้อหากระทู้ของคุณที่นี่..."
            error={errors.content}
            rows={12}
          />

          <div>
            <p className="text-sm font-medium text-ptn-text mb-2">รูปภาพประกอบ</p>
            <MultiImageUpload urls={imageUrls} onChange={setImageUrls} />
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={submitting} size="lg">
              <Send size={14} /> ตั้งกระทู้
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              ยกเลิก
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

import { useRef, useState, useEffect } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './Toast'

interface ImageUploadProps {
  bucket: 'avatars' | 'characters' | 'events'
  currentUrl?: string | null
  onUpload: (url: string) => void
  label?: string
  aspectRatio?: 'square' | 'banner' | 'portrait'
}

export function ImageUpload({ bucket, currentUrl, onUpload, label, aspectRatio = 'square' }: ImageUploadProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)

  useEffect(() => {
    setPreview(currentUrl || null)
  }, [currentUrl])

  const previewClass = {
    square:   'w-16 h-16',
    banner:   'w-40 h-20',
    portrait: 'w-14 h-18',
  }[aspectRatio]

  const handleFile = async (file: File) => {
    const MAX_MB = 5
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_MB}MB)`, 'error')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) {
      toast('อัปโหลดล้มเหลว: ' + error.message, 'error')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
    setPreview(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
    toast('อัปโหลดสำเร็จ!', 'success')
  }

  const handleClear = () => {
    setPreview(null)
    onUpload('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-ptn-muted mb-1.5">{label}</label>
      )}
      <div className="flex items-center gap-3">
        {/* Preview box */}
        <div
          className={`${previewClass} rounded-lg border border-ptn-border bg-ptn-elevated overflow-hidden flex items-center justify-center shrink-0`}
        >
          {preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-ptn-disabled" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-ptn-border rounded-md text-ptn-muted hover:text-ptn-text hover:border-ptn-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={13} />
            {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <X size={11} /> ลบรูป
            </button>
          )}
          <p className="text-xs text-ptn-disabled">PNG, JPG, WEBP — สูงสุด 5MB</p>
        </div>
      </div>
    </div>
  )
}

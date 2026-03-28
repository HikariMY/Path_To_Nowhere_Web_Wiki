// @ts-nocheck
import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from './Toast'

interface MultiImageUploadProps {
  urls: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function MultiImageUpload({ urls, onChange, maxImages = 4 }: MultiImageUploadProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList) {
    const remaining = maxImages - urls.length
    if (remaining <= 0) { toast(`อัปโหลดได้สูงสุด ${maxImages} ภาพ`, 'error'); return }

    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)

    const newUrls: string[] = []
    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) { toast(`${file.name} ใหญ่เกิน 5MB`, 'error'); continue }
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage.from('forum').upload(path, file, { upsert: true, contentType: file.type })
      if (error) { toast('อัปโหลดล้มเหลว: ' + error.message, 'error'); continue }
      const { data: { publicUrl } } = supabase.storage.from('forum').getPublicUrl(data.path)
      newUrls.push(publicUrl)
    }

    onChange([...urls, ...newUrls])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeUrl(i: number) {
    onChange(urls.filter((_, j) => j !== i))
  }

  return (
    <div className="space-y-2">
      {/* Preview grid */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-ptn-border bg-ptn-elevated shrink-0">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {urls.length < maxImages && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-dashed border-ptn-border rounded-lg text-ptn-muted hover:text-ptn-text hover:border-ptn-muted transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            {uploading ? 'กำลังอัปโหลด...' : `แนบรูปภาพ (${urls.length}/${maxImages})`}
          </button>
          <p className="text-xs text-ptn-disabled">PNG, JPG, WEBP, GIF — สูงสุด 5MB ต่อรูป</p>
        </>
      )}
    </div>
  )
}

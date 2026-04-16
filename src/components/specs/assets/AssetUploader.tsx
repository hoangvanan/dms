'use client'
import { useState, useRef } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '../../Toast'
import { useAuth } from '../../AuthProvider'

interface AssetUploaderProps {
  variantId: string | null  // null = shared asset
  onUploaded: (asset: any) => void
}

const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
]
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export default function AssetUploader({ variantId, onUploaded }: AssetUploaderProps) {
  const { profile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('File type not allowed. Use PNG, JPG, GIF, WebP, SVG, or PDF.', 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      showToast('File too large. Maximum 50MB.', 'error')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()

      // Build storage path
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = variantId
        ? `variants/${variantId}/${timestamp}_${sanitizedName}`
        : `shared/${timestamp}_${sanitizedName}`

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('spec-assets')
        .upload(storagePath, file, { upsert: false })

      if (storageError) throw storageError

      // Create database record
      const { data: asset, error: dbError } = await supabase
        .from('spec_assets')
        .insert({
          variant_id: variantId,
          label: file.name.replace(/\.[^/.]+$/, ''), // filename without extension
          file_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          is_shared: !variantId,
          uploaded_by: profile?.id,
        })
        .select()
        .single()

      if (dbError) throw dbError

      showToast('Asset uploaded', 'success')
      onUploaded(asset)
    } catch (err: any) {
      console.error('Upload error:', err)
      showToast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleUpload}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '6px',
          border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
          color: uploading ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontSize: '12px', cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading ? (
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Upload size={14} />
        )}
        {uploading ? 'Uploading...' : 'Upload Asset'}
      </button>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import AssetLibrary from '../assets/AssetLibrary'
import type { ImageContent, SpecAsset } from '@/types/specs'

interface Props {
  content: ImageContent
  onChange: (content: ImageContent) => void
  disabled: boolean
  variantId?: string
}

export default function ImageBlockEditor({ content, onChange, disabled, variantId }: Props) {
  const [showLibrary, setShowLibrary] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [assetLabel, setAssetLabel] = useState<string>('')

  // Load preview when asset_id changes
  useEffect(() => {
    if (!content.asset_id) {
      setPreviewUrl(null)
      setAssetLabel('')
      return
    }

    const loadPreview = async () => {
      const supabase = createClient()

      // Fetch asset record to get file_path and label
      const { data: asset } = await supabase
        .from('spec_assets')
        .select('file_path, label, mime_type')
        .eq('asset_id', content.asset_id)
        .single()

      if (asset) {
        setAssetLabel(asset.label)
        if (asset.mime_type?.startsWith('image/')) {
          const { data: urlData } = await supabase.storage
            .from('spec-assets')
            .createSignedUrl(asset.file_path, 3600)
          if (urlData?.signedUrl) {
            setPreviewUrl(urlData.signedUrl)
          }
        }
      }
    }

    loadPreview()
  }, [content.asset_id])

  const handleAssetSelect = (asset: SpecAsset) => {
    onChange({ ...content, asset_id: asset.asset_id })
    setShowLibrary(false)
  }

  const handleClearAsset = () => {
    onChange({ ...content, asset_id: '' })
    setPreviewUrl(null)
    setAssetLabel('')
  }

  return (
    <div>
      {/* Asset selection */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Image Asset
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {content.asset_id ? (
            <div style={{
              flex: 1, padding: '5px 8px', borderRadius: '4px',
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              fontSize: '12px', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{assetLabel || content.asset_id.substring(0, 8) + '...'}</span>
              {!disabled && (
                <button
                  onClick={handleClearAsset}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
            <div style={{
              flex: 1, padding: '5px 8px', borderRadius: '4px',
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              fontSize: '12px', color: 'var(--text-secondary)',
            }}>
              No image selected
            </div>
          )}
          {!disabled && (
            <button
              onClick={() => setShowLibrary(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', borderRadius: '4px',
                border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)', fontSize: '11px', cursor: 'pointer',
              }}
            >
              <ImageIcon size={12} /> Browse
            </button>
          )}
        </div>
      </div>

      {/* Width slider */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Width: {content.width_percent || 100}%
        </label>
        <input
          type="range"
          min={25}
          max={100}
          step={5}
          value={content.width_percent || 100}
          onChange={(e) => onChange({ ...content, width_percent: parseInt(e.target.value) })}
          disabled={disabled}
          style={{ width: '200px' }}
        />
      </div>

      {/* Caption */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Caption
        </label>
        <input
          value={content.caption || ''}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
          placeholder="Optional caption"
          disabled={disabled}
          style={{
            width: '100%', padding: '5px 8px', borderRadius: '4px',
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
          }}
        />
      </div>

      {/* Preview */}
      {previewUrl ? (
        <div style={{
          marginTop: '6px', padding: '8px', borderRadius: '6px',
          border: '1px solid var(--border)', background: 'var(--bg-primary)',
          textAlign: 'center',
        }}>
          <img
            src={previewUrl}
            alt={assetLabel}
            style={{
              maxWidth: `${content.width_percent || 100}%`,
              maxHeight: '200px',
              objectFit: 'contain',
            }}
          />
        </div>
      ) : !content.asset_id ? (
        <div style={{
          marginTop: '6px', padding: '24px', borderRadius: '6px',
          border: '2px dashed var(--border)', textAlign: 'center',
          color: 'var(--text-secondary)', fontSize: '12px',
        }}>
          <ImageIcon size={24} style={{ marginBottom: '6px', opacity: 0.4 }} />
          <div>Click &ldquo;Browse&rdquo; to select an image</div>
        </div>
      ) : null}

      {/* Asset Library Modal */}
      {showLibrary && variantId && (
        <AssetLibrary
          variantId={variantId}
          onSelect={handleAssetSelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  )
}

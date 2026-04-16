'use client'
import { useState, useEffect } from 'react'
import { Search, X, Check, Image as ImageIcon, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchAssets } from '@/lib/spec-helpers'
import AssetUploader from './AssetUploader'
import type { SpecAsset } from '@/types/specs'

interface AssetLibraryProps {
  variantId: string
  onSelect: (asset: SpecAsset) => void
  onClose: () => void
}

export default function AssetLibrary({ variantId, onSelect, onClose }: AssetLibraryProps) {
  const [assets, setAssets] = useState<SpecAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [previewUrl, setPreviewUrl] = useState<Record<string, string>>({})

  const loadAssets = async () => {
    setLoading(true)
    const data = await fetchAssets(variantId)
    setAssets(data)
    setLoading(false)

    // Generate signed URLs for image previews
    const supabase = createClient()
    const urls: Record<string, string> = {}
    for (const asset of data) {
      if (asset.mime_type.startsWith('image/')) {
        const { data: urlData } = await supabase.storage
          .from('spec-assets')
          .createSignedUrl(asset.file_path, 3600) // 1 hour
        if (urlData?.signedUrl) {
          urls[asset.asset_id] = urlData.signedUrl
        }
      }
    }
    setPreviewUrl(urls)
  }

  useEffect(() => {
    loadAssets()
  }, [variantId])

  const filtered = assets.filter(a =>
    !search || a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.file_name.toLowerCase().includes(search.toLowerCase())
  )

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Asset Library</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search + Upload */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: '10px', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
              }}
            />
          </div>
          <AssetUploader variantId={variantId} onUploaded={() => loadAssets()} />
        </div>

        {/* Asset Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {search ? 'No assets match your search.' : 'No assets yet. Upload one above.'}
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
            }}>
              {filtered.map(asset => (
                <button
                  key={asset.asset_id}
                  onClick={() => onSelect(asset)}
                  style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '8px', cursor: 'pointer',
                    textAlign: 'left', display: 'flex', flexDirection: 'column',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Preview */}
                  <div style={{
                    width: '100%', height: '100px', borderRadius: '4px', marginBottom: '6px',
                    background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {previewUrl[asset.asset_id] ? (
                      <img
                        src={previewUrl[asset.asset_id]}
                        alt={asset.label}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : asset.mime_type === 'application/pdf' ? (
                      <FileText size={24} color="var(--text-secondary)" />
                    ) : (
                      <ImageIcon size={24} color="var(--text-secondary)" />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{
                    fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {asset.label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                    <span>{formatSize(asset.file_size)}</span>
                    {asset.is_shared && (
                      <span style={{
                        padding: '0 4px', borderRadius: '3px',
                        background: 'rgba(79,143,247,0.12)', color: 'var(--accent)',
                      }}>
                        shared
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

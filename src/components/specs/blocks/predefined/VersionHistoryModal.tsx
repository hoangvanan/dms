'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Edit2, Check, Download } from 'lucide-react'
import { showToast } from '../../../Toast'
import { fetchVersions, updateVersionDescription, formatSpecDate } from '@/lib/spec-helpers'
import { createClient } from '@/lib/supabase'
import type { SpecVersion } from '@/types/specs'

interface Props {
  variantId: string
  onClose: () => void
}

export default function VersionHistoryModal({ variantId, onClose }: Props) {
  const [versions, setVersions] = useState<SpecVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchVersions(variantId)
      // Sort ascending (oldest first) for display
      setVersions(data.reverse())
    } catch (err) {
      console.error('Failed to load versions:', err)
    } finally {
      setLoading(false)
    }
  }, [variantId])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  const handleEditStart = (version: SpecVersion) => {
    setEditingId(version.version_id)
    setEditValue(version.change_description || '')
  }

  const handleEditSave = async (versionId: string) => {
    try {
      await updateVersionDescription(versionId, editValue)
      setVersions(prev =>
        prev.map(v => v.version_id === versionId ? { ...v, change_description: editValue } : v)
      )
      setEditingId(null)
      showToast('Description updated', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error')
    }
  }

  const handleDownloadPdf = async (version: SpecVersion) => {
    if (!version.generated_pdf_path) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('spec-assets')
        .createSignedUrl(version.generated_pdf_path, 300)

      if (error || !data?.signedUrl) throw new Error('Failed to get download URL')

      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      showToast(err.message || 'Failed to download PDF', 'error')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '600px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Version History</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Loading...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No revision history yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Rev', 'Date', 'Created By', 'Description', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '8px 6px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
                      color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--border)',
                      ...(h === 'Rev' ? { width: '50px' } : {}),
                      ...(h === 'Date' ? { width: '90px' } : {}),
                      ...(h === '' ? { width: '60px' } : {}),
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {versions.map(v => (
                  <tr key={v.version_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 6px', fontSize: '13px', fontWeight: 500 }}>
                      {v.index_rev || '—'}
                    </td>
                    <td style={{ padding: '8px 6px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatSpecDate(v.created_at)}
                    </td>
                    <td style={{ padding: '8px 6px', fontSize: '12px' }}>
                      {(v as any).created_by_profile?.full_name || '—'}
                    </td>
                    <td style={{ padding: '8px 6px', fontSize: '12px' }}>
                      {editingId === v.version_id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(v.version_id) }}
                            autoFocus
                            style={{
                              flex: 1, padding: '3px 6px', borderRadius: '4px',
                              border: '1px solid var(--border)', background: 'var(--bg-primary)',
                              color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => handleEditSave(v.version_id)}
                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px' }}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <span>{v.change_description || '—'}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleEditStart(v)}
                        title="Edit description"
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      {v.generated_pdf_path && (
                        <button
                          onClick={() => handleDownloadPdf(v)}
                          title="Download PDF"
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                        >
                          <Download size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

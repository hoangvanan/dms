'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Edit2, Check, Download, XCircle } from 'lucide-react'
import { showToast } from '../../../Toast'
import { fetchVersions, updateVersionDescription, formatSpecDate } from '@/lib/spec-helpers'
import { createClient } from '@/lib/supabase'
import type { SpecVersion, SpecStatus } from '@/types/specs'

interface Props {
  variantId: string
  specStatus: SpecStatus
  onClose: () => void
  onRevisionUpdated?: () => void
}

export default function VersionHistoryModal({ variantId, specStatus, onClose, onRevisionUpdated }: Props) {
  const [versions, setVersions] = useState<SpecVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<{ versionId: string; field: 'rev' | 'description' } | null>(null)
  const [editValue, setEditValue] = useState('')

  const isLocked = specStatus === 'released'

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

  const handleEditStart = (version: SpecVersion, field: 'rev' | 'description') => {
    if (isLocked) return
    setEditingField({ versionId: version.version_id, field })
    setEditValue(field === 'rev' ? (version.index_rev || '') : (version.change_description || ''))
  }

  const handleEditCancel = () => {
    setEditingField(null)
    setEditValue('')
  }

  const handleEditSave = async () => {
    if (!editingField) return
    const { versionId, field } = editingField

    try {
      const supabase = createClient()

      if (field === 'rev') {
        if (!editValue.trim()) {
          showToast('Revision letter is required', 'error')
          return
        }
        // Update index_rev in spec_versions
        const { error } = await supabase
          .from('spec_versions')
          .update({ index_rev: editValue.trim().toUpperCase() })
          .eq('version_id', versionId)
        if (error) throw error

        // Also update current_index_rev on spec_variants if this is the latest version
        const latestVersion = versions[versions.length - 1]
        if (latestVersion && latestVersion.version_id === versionId) {
          await supabase
            .from('spec_variants')
            .update({ current_index_rev: editValue.trim().toUpperCase() })
            .eq('variant_id', variantId)
        }

        setVersions(prev =>
          prev.map(v => v.version_id === versionId ? { ...v, index_rev: editValue.trim().toUpperCase() } : v)
        )
        showToast('Revision updated', 'success')
        if (onRevisionUpdated) onRevisionUpdated()
      } else {
        // Update description
        await updateVersionDescription(versionId, editValue)
        setVersions(prev =>
          prev.map(v => v.version_id === versionId ? { ...v, change_description: editValue } : v)
        )
        showToast('Description updated', 'success')
      }

      setEditingField(null)
      setEditValue('')
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

  const isEditing = (versionId: string, field: 'rev' | 'description') =>
    editingField?.versionId === versionId && editingField?.field === field

  const editInputStyle = {
    flex: 1,
    padding: '3px 6px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  }

  const editableCellStyle = (canEdit: boolean) => ({
    cursor: canEdit ? 'pointer' : 'default',
    padding: '2px 4px',
    borderRadius: '4px',
    border: '1px dashed transparent',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '620px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Version History</h3>
            {isLocked && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Spec is released — editing disabled
              </div>
            )}
          </div>
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
                      ...(h === 'Rev' ? { width: '45px' } : {}),
                      ...(h === 'Date' ? { width: '85px' } : {}),
                      ...(h === 'Created By' ? { width: '110px' } : {}),
                      ...(h === '' ? { width: '55px' } : {}),
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {versions.map(v => (
                  <tr key={v.version_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Rev — editable */}
                    <td style={{ padding: '8px 6px', fontSize: '13px', fontWeight: 500 }}>
                      {isEditing(v.version_id, 'rev') ? (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave()
                              if (e.key === 'Escape') handleEditCancel()
                            }}
                            autoFocus
                            maxLength={5}
                            style={{ ...editInputStyle, width: '35px', flex: 'none', textAlign: 'center' }}
                          />
                          <button
                            onClick={handleEditSave}
                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '1px' }}
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => !isLocked && handleEditStart(v, 'rev')}
                          style={editableCellStyle(!isLocked)}
                          onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.borderColor = 'var(--border)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
                          title={isLocked ? '' : 'Click to edit revision'}
                        >
                          {v.index_rev || '—'}
                        </span>
                      )}
                    </td>
                    {/* Date */}
                    <td style={{ padding: '8px 6px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatSpecDate(v.created_at)}
                    </td>
                    {/* Created By */}
                    <td style={{ padding: '8px 6px', fontSize: '12px' }}>
                      {(v as any).created_by_profile?.full_name || '—'}
                    </td>
                    {/* Description — editable */}
                    <td style={{ padding: '8px 6px', fontSize: '12px' }}>
                      {isEditing(v.version_id, 'description') ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave()
                              if (e.key === 'Escape') handleEditCancel()
                            }}
                            autoFocus
                            style={editInputStyle}
                          />
                          <button
                            onClick={handleEditSave}
                            style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px' }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => !isLocked && handleEditStart(v, 'description')}
                          style={editableCellStyle(!isLocked)}
                          onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.borderColor = 'var(--border)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
                          title={isLocked ? '' : 'Click to edit description'}
                        >
                          {v.change_description || '—'}
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {!isLocked && (
                          <button
                            onClick={() => handleEditStart(v, 'description')}
                            title="Edit description"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {v.generated_pdf_path && (
                          <button
                            onClick={() => handleDownloadPdf(v)}
                            title="Download PDF"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Download size={13} />
                          </button>
                        )}
                      </div>
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

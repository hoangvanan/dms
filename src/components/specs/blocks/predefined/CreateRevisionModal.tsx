'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { showToast } from '../../../Toast'
import { useAuth } from '../../../AuthProvider'
import { createRevision, getNextRevision } from '@/lib/spec-helpers'
import type { SpecVariant } from '@/types/specs'

interface Props {
  variant: SpecVariant
  onClose: () => void
  onCreated: () => void
}

export default function CreateRevisionModal({ variant, onClose, onCreated }: Props) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(getNextRevision(variant.current_index_rev))
  const [description, setDescription] = useState('')

  const handleCreate = async () => {
    if (!revision.trim()) {
      showToast('Revision letter is required', 'error')
      return
    }
    if (!description.trim()) {
      showToast('Change description is required', 'error')
      return
    }

    setLoading(true)
    try {
      await createRevision(
        variant.variant_id,
        revision.trim(),
        description.trim(),
        profile!.id
      )
      showToast(`Revision ${revision} created`, 'success')
      onCreated()
      onClose()
    } catch (err: any) {
      console.error('Create revision error:', err)
      showToast(err.message || 'Failed to create revision', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600 as const,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '440px', padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Create Revision</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Source info */}
        <div style={{
          padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{variant.type_designation}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {variant.umevs_part_no}
            {variant.current_index_rev ? ` · Current Rev: ${variant.current_index_rev}` : ' · Original'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Revision letter */}
          <div>
            <label style={labelStyle}>Revision *</label>
            <input
              value={revision}
              onChange={(e) => setRevision(e.target.value.toUpperCase())}
              placeholder="e.g. A"
              maxLength={5}
              style={{ ...inputStyle, width: '80px' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pre-filled with next letter. You can change it.
            </div>
          </div>

          {/* Change description */}
          <div>
            <label style={labelStyle}>Change Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what changed in this revision..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Revision'}
          </button>
        </div>
      </div>
    </div>
  )
}

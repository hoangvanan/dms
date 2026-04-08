'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import { X, Upload } from 'lucide-react'
import type { Document } from '@/types'

interface RevisionModalProps {
  document: Document
  onClose: () => void
  onSuccess: () => void
}

function getNextRevision(current: string | null): string {
  if (current === null) return 'A'
  const code = current.charCodeAt(current.length - 1)
  return String.fromCharCode(code + 1)
}

export default function RevisionModal({ document: doc, onClose, onSuccess }: RevisionModalProps) {
  const supabase = createClient()
  const { profile } = useAuth()

  const suggestedRev = getNextRevision(doc.current_revision)
  const [revision, setRevision] = useState(suggestedRev)
  const [changeDescription, setChangeDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !profile) return

    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${Date.now()}_${file.name}`

      // 1. Upload new file
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file)
      if (uploadError) throw uploadError

      // 2. Save current version as revision history with archived status
      await supabase.from('document_revisions').insert({
        document_id: doc.id,
        revision: doc.current_revision,
        file_path: doc.file_path,
        file_name: doc.file_name,
        file_size: doc.file_size,
        file_type: doc.file_type,
        change_description: null,
        status: 'archived',
        uploaded_by: doc.uploaded_by,
        verified_by: doc.verified_by,
        released_by: doc.released_by,
      })

      // 3. Update document with new file + reset status
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          current_revision: revision.toUpperCase(),
          status: 'processing',
          file_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          file_type: ext,
          uploaded_by: profile.id,
          verified_by: null,
          verified_at: null,
          released_by: null,
          released_at: null,
        })
        .eq('id', doc.id)

      if (updateError) throw updateError

      // 4. Create new revision record
      await supabase.from('document_revisions').insert({
        document_id: doc.id,
        revision: revision.toUpperCase(),
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        file_type: ext,
        change_description: changeDescription,
        status: 'processing',
        uploaded_by: profile.id,
      })

      // 5. Audit
      await supabase.from('audit_log').insert({
        user_id: profile.id,
        action: 'revision_upload',
        document_id: doc.id,
        details: {
          old_revision: doc.current_revision || 'Original',
          new_revision: revision.toUpperCase(),
          change_description: changeDescription,
        },
      })

      showToast(`Revision ${revision.toUpperCase()} uploaded`, 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Revision upload failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Upload Revision</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {doc.document_number} — Current: {doc.current_revision || 'Original'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label>New Revision *</label>
            <input type="text" value={revision} onChange={e => setRevision(e.target.value)} required maxLength={5} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Change Description *</label>
            <textarea
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              placeholder="Describe what changed in this revision"
              rows={3}
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Date</label>
            <input type="text" value={new Date().toLocaleDateString('en-GB')} disabled />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label>New File *</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ padding: '6px' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              <Upload size={14} />
              {loading ? 'Uploading...' : `Upload Rev ${revision.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

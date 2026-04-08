'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import type { Document, DocumentCategory, DrawingGroup } from '@/types'

interface PropertiesModalProps {
  document: Document
  onClose: () => void
  onSuccess: () => void
}

export default function PropertiesModal({ document: doc, onClose, onSuccess }: PropertiesModalProps) {
  const supabase = createClient()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [drawingGroups, setDrawingGroups] = useState<DrawingGroup[]>([])
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState(doc.title)
  const [description, setDescription] = useState(doc.description || '')
  const [categoryId, setCategoryId] = useState(doc.category_id)
  const [drawingGroupId, setDrawingGroupId] = useState(doc.drawing_group_id || '')
  const [project, setProject] = useState(doc.project || '')
  const [partNumbers, setPartNumbers] = useState<string[]>([])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isDrawingSpec = selectedCategory?.name === 'Drawing/Specification'

  useEffect(() => {
    const load = async () => {
      const [catRes, dgRes, pnRes] = await Promise.all([
        supabase.from('document_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('drawing_groups').select('*').eq('is_active', true).order('name'),
        supabase.from('document_part_numbers').select('*').eq('document_id', doc.id),
      ])
      if (catRes.data) setCategories(catRes.data)
      if (dgRes.data) setDrawingGroups(dgRes.data)
      if (pnRes.data) setPartNumbers(pnRes.data.map(p => p.part_number))
    }
    load()
  }, [doc.id])

  const addPartNumber = () => setPartNumbers([...partNumbers, ''])
  const removePartNumber = (idx: number) => setPartNumbers(partNumbers.filter((_, i) => i !== idx))
  const updatePartNumber = (idx: number, val: string) => {
    const updated = [...partNumbers]
    updated[idx] = val
    setPartNumbers(updated)
  }

  const handleSave = async () => {
    const cleanParts = partNumbers.map(p => p.trim()).filter(Boolean)
    if (cleanParts.length === 0) {
      showToast('At least one part number is required', 'error')
      return
    }

    setLoading(true)
    try {
      // 1. Update document
      const { error } = await supabase
        .from('documents')
        .update({
          title,
          description: description || null,
          category_id: categoryId,
          drawing_group_id: isDrawingSpec && drawingGroupId ? drawingGroupId : null,
          project: project || null,
        })
        .eq('id', doc.id)

      if (error) throw error

      // 2. Replace part numbers (delete all, re-insert)
      await supabase.from('document_part_numbers').delete().eq('document_id', doc.id)
      await supabase.from('document_part_numbers').insert(
        cleanParts.map(pn => ({ document_id: doc.id, part_number: pn.toUpperCase() }))
      )

      // 3. Audit log
      await supabase.from('audit_log').insert({
        user_id: profile!.id,
        action: 'edit_metadata',
        document_id: doc.id,
        details: {
          changes: { title, description, project, part_numbers: cleanParts },
        },
      })

      showToast('Properties updated', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Properties</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.document_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Read-only info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status</div>
            <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Revision</div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{doc.current_revision || 'Original'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>File</div>
            <div style={{ fontSize: '13px' }}>{doc.file_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Size</div>
            <div style={{ fontSize: '13px' }}>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        </div>

        {/* Editable fields */}
        <div style={{ marginBottom: '16px' }}>
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} disabled={!canEdit} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Category</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={!canEdit}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {isDrawingSpec && (
          <div style={{ marginBottom: '16px' }}>
            <label>Drawing Group</label>
            <select value={drawingGroupId} onChange={e => setDrawingGroupId(e.target.value)} disabled={!canEdit}>
              <option value="">None</option>
              {drawingGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label>Project</label>
          <input type="text" value={project} onChange={e => setProject(e.target.value)} disabled={!canEdit} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>Part Numbers</label>
          {partNumbers.map((pn, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <input type="text" value={pn} onChange={e => updatePartNumber(idx, e.target.value)} disabled={!canEdit} />
              {canEdit && partNumbers.length > 1 && (
                <button type="button" onClick={() => removePartNumber(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <button type="button" onClick={addPartNumber} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
              <Plus size={14} /> Add
            </button>
          )}
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
              <Save size={14} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

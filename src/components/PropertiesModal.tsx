'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import type { Document, DocumentCategory, DrawingGroup } from '@/types'

interface PartEntry {
  part_number: string
  description: string
  mpn: string
}

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
  const [categoryId, setCategoryId] = useState(doc.category_id)
  const [drawingGroupId, setDrawingGroupId] = useState(doc.drawing_group_id || '')
  const [projects, setProjects] = useState<string[]>([])
  const [parts, setParts] = useState<PartEntry[]>([])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isDrawingSpec = selectedCategory?.name === 'Drawing/Specification'
  const isDatasheet = selectedCategory?.name === 'Datasheet'
  const showMultiProject = !isDatasheet && selectedCategory

  useEffect(() => {
    const load = async () => {
      const [catRes, dgRes, pnRes, projRes] = await Promise.all([
        supabase.from('document_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('drawing_groups').select('*').eq('is_active', true).order('name'),
        supabase.from('document_part_numbers').select('*').eq('document_id', doc.id),
        supabase.from('document_projects').select('*').eq('document_id', doc.id),
      ])
      if (catRes.data) setCategories(catRes.data)
      if (dgRes.data) setDrawingGroups(dgRes.data)
      if (pnRes.data) {
        setParts(pnRes.data.map(p => ({
          part_number: p.part_number,
          description: p.description || '',
          mpn: p.mpn || '',
        })))
      }
      if (projRes.data && projRes.data.length > 0) {
        setProjects(projRes.data.map(p => p.project))
      } else if (doc.project) {
        setProjects([doc.project])
      }
    }
    load()
  }, [doc.id])

  const addProject = () => setProjects([...projects, ''])
  const removeProject = (idx: number) => setProjects(projects.filter((_, i) => i !== idx))
  const updateProject = (idx: number, val: string) => {
    const updated = [...projects]
    updated[idx] = val
    setProjects(updated)
  }

  const addPart = () => setParts([...parts, { part_number: '', description: '', mpn: '' }])
  const removePart = (idx: number) => setParts(parts.filter((_, i) => i !== idx))
  const updatePart = (idx: number, field: keyof PartEntry, val: string) => {
    const updated = [...parts]
    updated[idx] = { ...updated[idx], [field]: val }
    setParts(updated)
  }

  const handleSave = async () => {
    const cleanParts = parts.filter(p => p.part_number.trim())
    if (cleanParts.length === 0) {
      showToast('At least one part number is required', 'error')
      return
    }

    const missingDesc = cleanParts.some(p => !p.description.trim())
    if (missingDesc) {
      showToast('Description is required for every part number', 'error')
      return
    }

    if (isDatasheet) {
      const missingMpn = cleanParts.some(p => !p.mpn.trim())
      if (missingMpn) {
        showToast('MPN is required for every part number (Datasheet)', 'error')
        return
      }
    }

    const cleanProjects = projects.map(p => p.trim()).filter(Boolean)

    setLoading(true)
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title,
          description: null,
          category_id: categoryId,
          drawing_group_id: isDrawingSpec && drawingGroupId ? drawingGroupId : null,
          project: cleanProjects[0] || null,
        })
        .eq('id', doc.id)

      if (error) throw error

      // Replace part numbers with description + mpn
      await supabase.from('document_part_numbers').delete().eq('document_id', doc.id)
      await supabase.from('document_part_numbers').insert(
        cleanParts.map(p => ({
          document_id: doc.id,
          part_number: p.part_number.trim().toUpperCase(),
          description: p.description.trim(),
          mpn: isDatasheet ? p.mpn.trim() : null,
        }))
      )

      // Replace projects
      await supabase.from('document_projects').delete().eq('document_id', doc.id)
      if (cleanProjects.length > 0) {
        await supabase.from('document_projects').insert(
          cleanProjects.map(p => ({ document_id: doc.id, project: p }))
        )
      }

      await supabase.from('audit_log').insert({
        user_id: profile!.id,
        action: 'edit_metadata',
        document_id: doc.id,
        details: { changes: { title, projects: cleanProjects, parts: cleanParts } },
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px' }}>
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

        <div style={{ marginBottom: '16px' }}>
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} />
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

        {showMultiProject && (
          <div style={{ marginBottom: '16px' }}>
            <label>Project(s)</label>
            {projects.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input type="text" value={p} onChange={e => updateProject(idx, e.target.value)} disabled={!canEdit} placeholder="e.g. K5HA" />
                {canEdit && projects.length > 1 && (
                  <button type="button" onClick={() => removeProject(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button type="button" onClick={addProject} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                <Plus size={14} /> Add Project
              </button>
            )}
          </div>
        )}

        {/* Part Numbers with Description + MPN */}
        <div style={{ marginBottom: '20px' }}>
          <label>Part Numbers</label>
          <div style={{ display: 'grid', gridTemplateColumns: isDatasheet ? '1fr 1.5fr 1fr 32px' : '1fr 1.5fr 32px', gap: '6px', marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Part Number</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</div>
            {isDatasheet && <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>MPN</div>}
            <div></div>
          </div>
          {parts.map((part, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: isDatasheet ? '1fr 1.5fr 1fr 32px' : '1fr 1.5fr 32px', gap: '6px', marginBottom: '6px' }}>
              <input type="text" value={part.part_number} onChange={e => updatePart(idx, 'part_number', e.target.value)} disabled={!canEdit} style={{ fontSize: '12px' }} />
              <input type="text" value={part.description} onChange={e => updatePart(idx, 'description', e.target.value)} disabled={!canEdit} style={{ fontSize: '12px' }} />
              {isDatasheet && (
                <input type="text" value={part.mpn} onChange={e => updatePart(idx, 'mpn', e.target.value)} disabled={!canEdit} style={{ fontSize: '12px' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {canEdit && parts.length > 1 && (
                  <button type="button" onClick={() => removePart(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {canEdit && (
            <button type="button" onClick={addPart} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
              <Plus size={14} /> Add Part Number
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

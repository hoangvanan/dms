'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import { Upload, X, Plus, Trash2 } from 'lucide-react'
import type { DocumentCategory, DrawingGroup } from '@/types'

interface PartEntry {
  part_number: string
  description: string
  mpn: string
}

interface UploadModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const supabase = createClient()
  const { profile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [drawingGroups, setDrawingGroups] = useState<DrawingGroup[]>([])
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [drawingGroupId, setDrawingGroupId] = useState('')
  const [projects, setProjects] = useState<string[]>([''])
  const [parts, setParts] = useState<PartEntry[]>([{ part_number: '', description: '', mpn: '' }])
  const [file, setFile] = useState<File | null>(null)

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isDrawingSpec = selectedCategory?.name === 'Drawing/Specification'
  const isDatasheet = selectedCategory?.name === 'Datasheet'
  const showMultiProject = !isDatasheet && selectedCategory

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

  useEffect(() => {
    const load = async () => {
      const [catRes, dgRes] = await Promise.all([
        supabase.from('document_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('drawing_groups').select('*').eq('is_active', true).order('name'),
      ])
      if (catRes.data) setCategories(catRes.data)
      if (dgRes.data) setDrawingGroups(dgRes.data)
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !profile) return

    const cleanParts = parts.filter(p => p.part_number.trim())
    if (cleanParts.length === 0) {
      showToast('At least one part number is required', 'error')
      return
    }

    // Validate description is filled for all parts
    const missingDesc = cleanParts.some(p => !p.description.trim())
    if (missingDesc) {
      showToast('Description is required for every part number', 'error')
      return
    }

    // Validate MPN for datasheet
    if (isDatasheet) {
      const missingMpn = cleanParts.some(p => !p.mpn.trim())
      if (missingMpn) {
        showToast('MPN is required for every part number (Datasheet)', 'error')
        return
      }
    }

    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${Date.now()}_${file.name}`
      const cleanProjects = projects.map(p => p.trim()).filter(Boolean)

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file)
      if (uploadError) throw uploadError

      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          title,
          description: description || null,
          category_id: categoryId,
          drawing_group_id: isDrawingSpec && drawingGroupId ? drawingGroupId : null,
          project: cleanProjects[0] || null,
          current_revision: null,
          status: 'processing',
          file_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          file_type: ext,
          uploaded_by: profile.id,
        })
        .select()
        .single()

      if (docError) throw docError

      await supabase.from('document_revisions').insert({
        document_id: doc.id,
        revision: null,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        file_type: ext,
        change_description: 'Original document',
        status: 'processing',
        uploaded_by: profile.id,
      })

      // Insert parts with description + mpn
      await supabase.from('document_part_numbers').insert(
        cleanParts.map(p => ({
          document_id: doc.id,
          part_number: p.part_number.trim().toUpperCase(),
          description: p.description.trim(),
          mpn: isDatasheet ? p.mpn.trim() : null,
        }))
      )

      if (cleanProjects.length > 0) {
        await supabase.from('document_projects').insert(
          cleanProjects.map(p => ({ document_id: doc.id, project: p }))
        )
      }

      await supabase.from('audit_log').insert({
        user_id: profile.id,
        action: 'upload',
        document_id: doc.id,
        details: { title, parts: cleanParts, projects: cleanProjects, category: selectedCategory?.name },
      })

      showToast('Document uploaded successfully', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '780px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Upload Document</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label>File *</label>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ padding: '6px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" required />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Document Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional general description" rows={2} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label>Document Category *</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
              <option value="">Select category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {isDrawingSpec && (
            <div style={{ marginBottom: '16px' }}>
              <label>Drawing Group</label>
              <select value={drawingGroupId} onChange={e => setDrawingGroupId(e.target.value)}>
                <option value="">Select drawing group...</option>
                {drawingGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {showMultiProject && (
            <div style={{ marginBottom: '16px' }}>
              <label>Project(s)</label>
              {projects.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <input type="text" value={p} onChange={e => updateProject(idx, e.target.value)} placeholder="e.g. K5HA, Bajaj 750W" />
                  {projects.length > 1 && (
                    <button type="button" onClick={() => removeProject(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addProject} className="btn btn-secondary" style={{ marginTop: '4px', fontSize: '12px', padding: '4px 10px' }}>
                <Plus size={14} /> Add Project
              </button>
            </div>
          )}

          {/* Part Numbers with Description + MPN */}
          <div style={{ marginBottom: '20px' }}>
            <label>Part Numbers *</label>
            <div style={{ display: 'grid', gridTemplateColumns: isDatasheet ? '1fr 1.5fr 1fr 32px' : '1fr 1.5fr 32px', gap: '6px', marginBottom: '6px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Part Number</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</div>
              {isDatasheet && <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>MPN</div>}
              <div></div>
            </div>
            {parts.map((part, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: isDatasheet ? '1fr 1.5fr 1fr 32px' : '1fr 1.5fr 32px', gap: '6px', marginBottom: '6px' }}>
                <input
                  type="text"
                  value={part.part_number}
                  onChange={e => updatePart(idx, 'part_number', e.target.value)}
                  placeholder="20005678"
                  style={{ fontSize: '12px' }}
                />
                <input
                  type="text"
                  value={part.description}
                  onChange={e => updatePart(idx, 'description', e.target.value)}
                  placeholder="MLCC 100nF 0402 X7R 16V"
                  style={{ fontSize: '12px' }}
                />
                {isDatasheet && (
                  <input
                    type="text"
                    value={part.mpn}
                    onChange={e => updatePart(idx, 'mpn', e.target.value)}
                    placeholder="GRM155R71C104KA88D"
                    style={{ fontSize: '12px' }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {parts.length > 1 && (
                    <button type="button" onClick={() => removePart(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addPart} className="btn btn-secondary" style={{ marginTop: '4px', fontSize: '12px', padding: '4px 10px' }}>
              <Plus size={14} /> Add Part Number
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              <Upload size={14} />
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

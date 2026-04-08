'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import { Upload, X, Plus, Trash2 } from 'lucide-react'
import type { DocumentCategory, DrawingGroup } from '@/types'

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
  const [project, setProject] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [partNumbers, setPartNumbers] = useState<string[]>([''])
  const [file, setFile] = useState<File | null>(null)

  const selectedCategory = categories.find(c => c.id === categoryId)
  const isDrawingSpec = selectedCategory?.name === 'Drawing/Specification'
  const isDatasheet = selectedCategory?.name === 'Datasheet'

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

  const addPartNumber = () => setPartNumbers([...partNumbers, ''])
  const removePartNumber = (idx: number) => setPartNumbers(partNumbers.filter((_, i) => i !== idx))
  const updatePartNumber = (idx: number, val: string) => {
    const updated = [...partNumbers]
    updated[idx] = val
    setPartNumbers(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !profile) return

    const cleanParts = partNumbers.map(p => p.trim()).filter(Boolean)
    if (cleanParts.length === 0) {
      showToast('At least one part number is required', 'error')
      return
    }

    if (isDatasheet && !manufacturer.trim()) {
      showToast('Manufacturer is required for Datasheet', 'error')
      return
    }

    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${Date.now()}_${file.name}`

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
          project: project || null,
          manufacturer: isDatasheet ? manufacturer.trim() : null,
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

      const partInserts = cleanParts.map(pn => ({
        document_id: doc.id,
        part_number: pn.toUpperCase(),
      }))
      await supabase.from('document_part_numbers').insert(partInserts)

      await supabase.from('audit_log').insert({
        user_id: profile.id,
        action: 'upload',
        document_id: doc.id,
        details: { title, part_numbers: cleanParts, category: selectedCategory?.name, manufacturer: manufacturer.trim() || null },
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
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
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
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

          {isDatasheet && (
            <div style={{ marginBottom: '16px' }}>
              <label>Manufacturer (MFR) *</label>
              <input type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Walsin, Yageo, TDK" required />
            </div>
          )}

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

          <div style={{ marginBottom: '16px' }}>
            <label>Project</label>
            <input type="text" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. K5HA, Bajaj 750W" />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label>Part Numbers *</label>
            {partNumbers.map((pn, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="text"
                  value={pn}
                  onChange={e => updatePartNumber(idx, e.target.value)}
                  placeholder="e.g. 20005678"
                />
                {partNumbers.length > 1 && (
                  <button type="button" onClick={() => removePartNumber(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPartNumber}
              className="btn btn-secondary"
              style={{ marginTop: '4px', fontSize: '12px', padding: '4px 10px' }}
            >
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

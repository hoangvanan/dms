'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { showToast } from './Toast'
import { Settings, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import type { DocumentCategory, DrawingGroup } from '@/types'

export default function ManageCategories() {
  const supabase = createClient()
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [drawingGroups, setDrawingGroups] = useState<DrawingGroup[]>([])
  const [newCat, setNewCat] = useState('')
  const [newDG, setNewDG] = useState('')

  const fetchData = async () => {
    const [catRes, dgRes] = await Promise.all([
      supabase.from('document_categories').select('*').order('name'),
      supabase.from('drawing_groups').select('*').order('name'),
    ])
    if (catRes.data) setCategories(catRes.data)
    if (dgRes.data) setDrawingGroups(dgRes.data)
  }

  useEffect(() => { fetchData() }, [])

  const addCategory = async () => {
    if (!newCat.trim()) return
    const { error } = await supabase.from('document_categories').insert({ name: newCat.trim() })
    if (error) { showToast(error.message, 'error'); return }
    showToast('Category added', 'success')
    setNewCat('')
    fetchData()
  }

  const toggleCategory = async (cat: DocumentCategory) => {
    await supabase.from('document_categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    fetchData()
  }

  const addDrawingGroup = async () => {
    if (!newDG.trim()) return
    const { error } = await supabase.from('drawing_groups').insert({ name: newDG.trim() })
    if (error) { showToast(error.message, 'error'); return }
    showToast('Drawing group added', 'success')
    setNewDG('')
    fetchData()
  }

  const toggleDrawingGroup = async (dg: DrawingGroup) => {
    await supabase.from('drawing_groups').update({ is_active: !dg.is_active }).eq('id', dg.id)
    fetchData()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} /> Categories & Drawing Groups
        </h2>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Categories */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Document Categories</h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              placeholder="New category name"
              onKeyDown={e => e.key === 'Enter' && addCategory()}
            />
            <button className="btn btn-primary" onClick={addCategory} style={{ whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-tertiary)',
                opacity: cat.is_active ? 1 : 0.5,
              }}>
                <span style={{ fontSize: '13px' }}>{cat.name}</span>
                <button
                  onClick={() => toggleCategory(cat)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: cat.is_active ? 'var(--success)' : 'var(--text-secondary)' }}
                >
                  {cat.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Drawing Groups */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Drawing Groups</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Only applies to "Drawing/Specification" category
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={newDG}
              onChange={e => setNewDG(e.target.value)}
              placeholder="New drawing group name"
              onKeyDown={e => e.key === 'Enter' && addDrawingGroup()}
            />
            <button className="btn btn-primary" onClick={addDrawingGroup} style={{ whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Add
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {drawingGroups.map(dg => (
              <div key={dg.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-tertiary)',
                opacity: dg.is_active ? 1 : 0.5,
              }}>
                <span style={{ fontSize: '13px' }}>{dg.name}</span>
                <button
                  onClick={() => toggleDrawingGroup(dg)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: dg.is_active ? 'var(--success)' : 'var(--text-secondary)' }}
                >
                  {dg.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

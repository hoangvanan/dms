'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import DocumentList from './DocumentList'
import { FolderOpen, ChevronLeft, FileText } from 'lucide-react'
import type { DocumentCategory } from '@/types'

export default function BrowseByCategory() {
  const supabase = createClient()
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: cats } = await supabase
        .from('document_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (cats) {
        setCategories(cats)

        // Get count per category
        const { data: docs } = await supabase
          .from('documents')
          .select('category_id')
          .neq('status', 'archived')

        if (docs) {
          const countMap: Record<string, number> = {}
          docs.forEach(d => {
            countMap[d.category_id] = (countMap[d.category_id] || 0) + 1
          })
          setCounts(countMap)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  if (selected) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: 'none', border: 'none', color: 'var(--accent)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '13px', padding: '4px 8px', borderRadius: '6px',
            }}
          >
            <ChevronLeft size={16} /> Back to Categories
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>|</span>
          <FolderOpen size={16} color="var(--accent)" />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{selectedName}</span>
        </div>
        <DocumentList filterCategory={selected} />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpen size={20} /> Browse by Category
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Select a category to view its documents
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Loading...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelected(cat.id); setSelectedName(cat.name) }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '24px 16px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(79,143,247,0.05)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(79,143,247,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FolderOpen size={24} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <FileText size={12} />
                    {counts[cat.id] || 0} documents
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

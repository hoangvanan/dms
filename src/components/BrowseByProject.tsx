'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import DocumentList from './DocumentList'
import { LayoutGrid, ChevronLeft, FileText } from 'lucide-react'

interface ProjectInfo {
  name: string
  count: number
}

export default function BrowseByProject() {
  const supabase = createClient()
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: docs } = await supabase
        .from('documents')
        .select('project')
        .neq('status', 'archived')

      if (docs) {
        const countMap: Record<string, number> = {}
        docs.forEach(d => {
          const proj = d.project || '(No Project)'
          countMap[proj] = (countMap[proj] || 0) + 1
        })

        const sorted = Object.entries(countMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name))

        setProjects(sorted)
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
            <ChevronLeft size={16} /> Back to Projects
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>|</span>
          <LayoutGrid size={16} color="var(--accent)" />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{selected}</span>
        </div>
        <DocumentList filterProject={selected === '(No Project)' ? '' : selected} />
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
          <LayoutGrid size={20} /> Browse by Project
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Select a project to view its documents
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No projects found</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {projects.map(proj => (
              <button
                key={proj.name}
                onClick={() => setSelected(proj.name)}
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
                  background: 'rgba(251,191,36,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LayoutGrid size={24} color="#fbbf24" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <FileText size={12} />
                    {proj.count} documents
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

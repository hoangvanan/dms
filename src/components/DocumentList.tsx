'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { showToast } from './Toast'
import ContextMenu from './ContextMenu'
import PropertiesModal from './PropertiesModal'
import RevisionModal from './RevisionModal'
import HistoryModal from './HistoryModal'
import UploadModal from './UploadModal'
import { Search, Upload, Filter, X, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import type { Document, DocumentCategory } from '@/types'

interface DocumentListProps {
  filterCategory?: string
  filterProject?: string
}

export default function DocumentList({ filterCategory, filterProject }: DocumentListProps) {
  const supabase = createClient()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'

  const [documents, setDocuments] = useState<Document[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Search & filters
  const [searchType, setSearchType] = useState<'part_number' | 'project' | 'category' | 'title'>('part_number')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>(filterCategory || '')
  const [projectFilter, setProjectFilter] = useState<string>(filterProject || '')

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [showProperties, setShowProperties] = useState<Document | null>(null)
  const [showRevision, setShowRevision] = useState<Document | null>(null)
  const [showHistory, setShowHistory] = useState<Document | null>(null)

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; doc: Document } | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('documents')
      .select(`
        *,
        document_categories(id, name),
        drawing_groups(id, name),
        profiles:uploaded_by(id, full_name),
        document_part_numbers(id, part_number)
      `, { count: 'exact' })
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    // Apply filters
    if (statusFilter) query = query.eq('status', statusFilter)
    if (categoryFilter) query = query.eq('category_id', categoryFilter)

    // Project filter
    if (projectFilter) {
      query = query.ilike('project', `%${projectFilter}%`)
    }

    const { data, count, error } = await query.limit(100)

    if (error) {
      showToast('Failed to load documents', 'error')
      setLoading(false)
      return
    }

    let filtered = data || []

    // Client-side search for part_number (since it's in a junction table)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase()
      if (searchType === 'part_number') {
        filtered = filtered.filter(d =>
          d.document_part_numbers?.some((p: any) => p.part_number.includes(q))
        )
      } else if (searchType === 'title') {
        filtered = filtered.filter(d =>
          d.title.toUpperCase().includes(q) ||
          (d.description || '').toUpperCase().includes(q)
        )
      } else if (searchType === 'project') {
        filtered = filtered.filter(d =>
          (d.project || '').toUpperCase().includes(q)
        )
      }
    }

    setDocuments(filtered)
    setTotal(count || 0)
    setLoading(false)
  }, [statusFilter, categoryFilter, projectFilter, searchQuery, searchType])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    supabase.from('document_categories').select('*').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  const handleContextMenu = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, doc })
  }

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 300)
    if (data?.signedUrl) {
      const a = window.document.createElement('a')
      a.href = data.signedUrl
      a.download = doc.file_name
      a.click()
    }
    // Audit
    await supabase.from('audit_log').insert({
      user_id: profile!.id,
      action: 'download',
      document_id: doc.id,
      details: { file_name: doc.file_name, revision: doc.current_revision },
    })
  }

  const handleVerify = async (doc: Document) => {
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'verification',
        verified_by: profile!.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    await supabase.from('audit_log').insert({
      user_id: profile!.id,
      action: 'verify',
      document_id: doc.id,
      details: { document_number: doc.document_number },
    })

    showToast(`${doc.document_number} verified`, 'success')
    fetchDocuments()
  }

  const handleRelease = async (doc: Document) => {
    const isAdmin = profile!.role === 'admin'
    if (!isAdmin && doc.verified_by === profile!.id) {
      showToast('4-eyes rule: You cannot release a document you verified', 'error')
      return
    }

    const { error } = await supabase
      .from('documents')
      .update({
        status: 'released',
        released_by: profile!.id,
        released_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    await supabase.from('audit_log').insert({
      user_id: profile!.id,
      action: 'release',
      document_id: doc.id,
      details: { document_number: doc.document_number },
    })

    showToast(`${doc.document_number} released`, 'success')
    fetchDocuments()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={searchType}
              onChange={e => setSearchType(e.target.value as any)}
              style={{ borderRadius: '6px 0 0 6px', borderRight: 'none', width: '140px', fontSize: '12px' }}
            >
              <option value="part_number">Part Number</option>
              <option value="title">Title</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={`Search by ${searchType.replace('_', ' ')}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', borderRadius: '0 6px 6px 0' }}
            />
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={14} /> Upload
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ width: '180px', fontSize: '12px', padding: '5px 8px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: '140px', fontSize: '12px', padding: '5px 8px' }}
          >
            <option value="">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="verification">Verification</option>
            <option value="released">Released</option>
          </select>
          {(categoryFilter || statusFilter || searchQuery) && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); setSearchQuery('') }}
            >
              <X size={12} /> Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {documents.length} documents
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Doc Number</th>
              <th>Title</th>
              <th style={{ width: '120px' }}>Rev</th>
              <th style={{ width: '180px' }}>Part Numbers</th>
              <th style={{ width: '160px' }}>Category</th>
              <th style={{ width: '110px' }}>Status</th>
              <th style={{ width: '100px' }}>Project</th>
              <th style={{ width: '100px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No documents found</td></tr>
            ) : (
              documents.map(doc => (
                <tr
                  key={doc.id}
                  onContextMenu={e => handleContextMenu(e, doc)}
                  onDoubleClick={() => setShowProperties(doc)}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>{doc.document_number}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{doc.title}</div>
                    {doc.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-tertiary)',
                    }}>
                      {doc.current_revision || 'Original'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {doc.document_part_numbers?.slice(0, 3).map((p: any) => (
                        <span key={p.id} style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: 'rgba(79,143,247,0.1)',
                          color: 'var(--accent)',
                        }}>
                          {p.part_number}
                        </span>
                      ))}
                      {(doc.document_part_numbers?.length || 0) > 3 && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          +{doc.document_part_numbers!.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {(doc.document_categories as any)?.name || '-'}
                  </td>
                  <td>
                    <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
                  </td>
                  <td style={{ fontSize: '12px' }}>{doc.project || '-'}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {format(new Date(doc.created_at), 'dd MMM yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          document={ctxMenu.doc}
          onClose={() => setCtxMenu(null)}
          onProperties={() => { setShowProperties(ctxMenu.doc); setCtxMenu(null) }}
          onUploadRevision={() => { setShowRevision(ctxMenu.doc); setCtxMenu(null) }}
          onViewHistory={() => { setShowHistory(ctxMenu.doc); setCtxMenu(null) }}
          onDownload={() => { handleDownload(ctxMenu.doc); setCtxMenu(null) }}
          onVerify={() => { handleVerify(ctxMenu.doc); setCtxMenu(null) }}
          onRelease={() => { handleRelease(ctxMenu.doc); setCtxMenu(null) }}
        />
      )}

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchDocuments} />}
      {showProperties && <PropertiesModal document={showProperties} onClose={() => setShowProperties(null)} onSuccess={fetchDocuments} />}
      {showRevision && <RevisionModal document={showRevision} onClose={() => setShowRevision(null)} onSuccess={fetchDocuments} />}
      {showHistory && <HistoryModal document={showHistory} onClose={() => setShowHistory(null)} />}
    </div>
  )
}

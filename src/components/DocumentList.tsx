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
import { Search, Upload, Filter, X, Download, FileText, Eye, ExternalLink, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { Document, DocumentCategory } from '@/types'

interface DocumentListProps {
  filterCategory?: string
  filterProject?: string
}

const PREVIEWABLE_TYPES = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'txt', 'csv', 'html']

export default function DocumentList({ filterCategory, filterProject }: DocumentListProps) {
  const supabase = createClient()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'

  const [documents, setDocuments] = useState<Document[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Search & filters
  const [searchType, setSearchType] = useState<'part_number' | 'project' | 'title' | 'part_description'>('part_number')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>(filterCategory || '')
  const [projectFilter, setProjectFilter] = useState<string>(filterProject || '')

  // Sync with parent props
  useEffect(() => { setCategoryFilter(filterCategory || '') }, [filterCategory])
  useEffect(() => { setProjectFilter(filterProject || '') }, [filterProject])

  // Modals
  const [showUpload, setShowUpload] = useState(false)
  const [showProperties, setShowProperties] = useState<Document | null>(null)
  const [showRevision, setShowRevision] = useState<Document | null>(null)
  const [showHistory, setShowHistory] = useState<Document | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null)

  // Preview panel
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTab, setPreviewTab] = useState<'file' | 'parts'>('file')

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
        document_part_numbers(id, part_number, description, mpn),
        document_projects(id, project)
      `, { count: 'exact' })
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (statusFilter) query = query.eq('status', statusFilter)
    if (categoryFilter) query = query.eq('category_id', categoryFilter)

    const { data, count, error } = await query.limit(100)

    if (error) {
      showToast('Failed to load documents', 'error')
      setLoading(false)
      return
    }

    let filtered = data || []

    // Client-side filter for project (from junction table)
    if (projectFilter) {
      const pf = projectFilter.toUpperCase()
      filtered = filtered.filter(d =>
        d.document_projects?.some((p: any) => p.project.toUpperCase().includes(pf)) ||
        (d.project || '').toUpperCase().includes(pf)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase()
      if (searchType === 'part_number') {
        filtered = filtered.filter(d =>
          d.document_part_numbers?.some((p: any) => p.part_number.includes(q))
        )
      } else if (searchType === 'title') {
        filtered = filtered.filter(d =>
          d.title.toUpperCase().includes(q)
        )
      } else if (searchType === 'part_description') {
        filtered = filtered.filter(d =>
          d.document_part_numbers?.some((p: any) =>
            (p.description || '').toUpperCase().includes(q) ||
            (p.mpn || '').toUpperCase().includes(q)
          )
        )
      } else if (searchType === 'project') {
        filtered = filtered.filter(d =>
          d.document_projects?.some((p: any) => p.project.toUpperCase().includes(q)) ||
          (d.project || '').toUpperCase().includes(q)
        )
      }
    }

    setDocuments(filtered)
    setTotal(count || 0)
    setLoading(false)
  }, [statusFilter, categoryFilter, projectFilter, searchQuery, searchType])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  useEffect(() => {
    supabase.from('document_categories').select('*').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  const handleContextMenu = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, doc })
  }

  // Force download (browser saves file)
  const handleDownload = async (doc: Document, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 300, {
      download: doc.file_name,
    })
    if (data?.signedUrl) {
      const a = window.document.createElement('a')
      a.href = data.signedUrl
      a.download = doc.file_name
      a.click()
    }
    await supabase.from('audit_log').insert({
      user_id: profile!.id,
      action: 'download',
      document_id: doc.id,
      details: { file_name: doc.file_name, revision: doc.current_revision },
    })
  }

  // Preview panel: single click on row
  const handlePreview = async (doc: Document) => {
    setPreviewDoc(doc)
    setPreviewUrl(null)
    setPreviewLoading(true)
    setPreviewTab('file')

    const isPreviewable = PREVIEWABLE_TYPES.includes(doc.file_type.toLowerCase())
    if (isPreviewable) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 600)
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl)
      }
    }

    // Log view
    await supabase.from('audit_log').insert({
      user_id: profile!.id,
      action: 'view',
      document_id: doc.id,
      details: { file_name: doc.file_name },
    })

    setPreviewLoading(false)
  }

  const handleOpenInNewTab = async () => {
    if (!previewDoc) return
    const { data } = await supabase.storage.from('documents').createSignedUrl(previewDoc.file_path, 600)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  const handleVerify = async (doc: Document) => {
    const { error } = await supabase
      .from('documents')
      .update({ status: 'verification', verified_by: profile!.id, verified_at: new Date().toISOString() })
      .eq('id', doc.id)
    if (error) { showToast(error.message, 'error'); return }
    await supabase.from('audit_log').insert({
      user_id: profile!.id, action: 'verify', document_id: doc.id,
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
      .update({ status: 'released', released_by: profile!.id, released_at: new Date().toISOString() })
      .eq('id', doc.id)
    if (error) { showToast(error.message, 'error'); return }
    await supabase.from('audit_log').insert({
      user_id: profile!.id, action: 'release', document_id: doc.id,
      details: { document_number: doc.document_number },
    })
    showToast(`${doc.document_number} released`, 'success')
    fetchDocuments()
  }

  const handleDelete = async (doc: Document) => {
    try {
      await supabase.storage.from('documents').remove([doc.file_path])
      const { data: revisions } = await supabase
        .from('document_revisions').select('file_path').eq('document_id', doc.id)
      if (revisions && revisions.length > 0) {
        await supabase.storage.from('documents').remove(revisions.map(r => r.file_path))
      }
      await supabase.from('audit_log').insert({
        user_id: profile!.id, action: 'archive', document_id: doc.id,
        details: { action: 'deleted', document_number: doc.document_number, title: doc.title,
          part_numbers: doc.document_part_numbers?.map((p: any) => p.part_number) },
      })
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
      if (previewDoc?.id === doc.id) { setPreviewDoc(null); setPreviewUrl(null) }
      showToast(`${doc.document_number} deleted`, 'success')
      fetchDocuments()
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }

  const isPreviewable = previewDoc ? PREVIEWABLE_TYPES.includes(previewDoc.file_type.toLowerCase()) : false

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select value={searchType} onChange={e => setSearchType(e.target.value as any)}
              style={{ borderRadius: '6px 0 0 6px', borderRight: 'none', width: '140px', fontSize: '12px' }}>
              <option value="part_number">Part Number</option>
              <option value="title">Title</option>
              <option value="part_description">Description / MPN</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" placeholder={`Search by ${searchType.replace('_', ' ')}...`}
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', borderRadius: '0 6px 6px 0' }} />
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={14} /> Upload
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '180px', fontSize: '12px', padding: '5px 8px' }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '140px', fontSize: '12px', padding: '5px 8px' }}>
            <option value="">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="verification">Verification</option>
            <option value="released">Released</option>
          </select>
          {(categoryFilter || statusFilter || searchQuery) && (
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); setSearchQuery('') }}>
              <X size={12} /> Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {documents.length} documents
          </span>
        </div>
      </div>

      {/* Main content area: table + preview panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '120px' }}>Doc Number</th>
                <th>Title</th>
                <th style={{ width: '60px' }}>Rev</th>
                <th style={{ width: '150px' }}>Part Numbers</th>
                <th style={{ width: '130px' }}>Category</th>
                <th style={{ width: '130px' }}>MPN</th>
                <th style={{ width: '95px' }}>Status</th>
                <th style={{ width: '90px' }}>Project</th>
                <th style={{ width: '85px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No documents found</td></tr>
              ) : (
                documents.map(doc => (
                  <tr key={doc.id}
                    onClick={() => handlePreview(doc)}
                    onContextMenu={e => handleContextMenu(e, doc)}
                    onDoubleClick={() => setShowProperties(doc)}
                    style={{ background: previewDoc?.id === doc.id ? 'rgba(79,143,247,0.08)' : undefined }}
                  >
                    {/* Download icon */}
                    <td style={{ textAlign: 'center', padding: '6px' }}>
                      <button
                        onClick={(e) => handleDownload(doc, e)}
                        title="Download"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-secondary)', padding: '4px',
                          borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      >
                        <Download size={15} />
                      </button>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>{doc.document_number}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{doc.title}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)' }}>
                        {doc.current_revision || 'Org'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {doc.document_part_numbers?.slice(0, 3).map((p: any) => (
                          <span key={p.id} style={{ fontSize: '11px', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px', background: 'rgba(79,143,247,0.1)', color: 'var(--accent)' }}>
                            {p.part_number}
                          </span>
                        ))}
                        {(doc.document_part_numbers?.length || 0) > 3 && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+{doc.document_part_numbers!.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>{(doc.document_categories as any)?.name || '-'}</div>
                      {(doc.drawing_groups as any)?.name && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {(doc.drawing_groups as any).name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {doc.document_part_numbers?.filter((p: any) => p.mpn).slice(0, 3).map((p: any) => (
                          <span key={p.id} style={{ fontSize: '11px', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px', background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                            {p.mpn}
                          </span>
                        ))}
                        {(doc.document_part_numbers?.filter((p: any) => p.mpn).length || 0) > 3 && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+{doc.document_part_numbers!.filter((p: any) => p.mpn).length - 3}</span>
                        )}
                        {!doc.document_part_numbers?.some((p: any) => p.mpn) && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>}
                      </div>
                    </td>
                    <td><span className={`status-badge status-${doc.status}`}>{doc.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {(doc.document_projects && doc.document_projects.length > 0)
                          ? doc.document_projects.slice(0, 3).map((p: any) => (
                              <span key={p.id} style={{ fontSize: '11px', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                                {p.project}
                              </span>
                            ))
                          : doc.project
                            ? <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>{doc.project}</span>
                            : <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>
                        }
                        {(doc.document_projects?.length || 0) > 3 && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+{doc.document_projects!.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{format(new Date(doc.created_at), 'dd MMM yyyy')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Preview Panel */}
        {previewDoc && (
          <div style={{
            width: '600px',
            minWidth: '600px',
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Preview Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewDoc.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {previewDoc.document_number} · Rev {previewDoc.current_revision || 'Original'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                <button onClick={handleOpenInNewTab} title="Open in new tab"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  <ExternalLink size={16} />
                </button>
                <button onClick={(e) => handleDownload(previewDoc, e)} title="Download"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  <Download size={16} />
                </button>
                <button onClick={() => { setPreviewDoc(null); setPreviewUrl(null) }} title="Close preview"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  <XCircle size={16} />
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setPreviewTab('file')} style={{
                flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: previewTab === 'file' ? 'var(--bg-tertiary)' : 'transparent',
                color: previewTab === 'file' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: previewTab === 'file' ? '2px solid var(--accent)' : '2px solid transparent',
              }}>File Preview</button>
              <button onClick={() => setPreviewTab('parts')} style={{
                flex: 1, padding: '8px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: previewTab === 'parts' ? 'var(--bg-tertiary)' : 'transparent',
                color: previewTab === 'parts' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: previewTab === 'parts' ? '2px solid var(--accent)' : '2px solid transparent',
              }}>Parts ({previewDoc.document_part_numbers?.length || 0})</button>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {previewTab === 'parts' ? (
                /* Parts List Tab */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    {previewDoc.document_part_numbers?.length || 0} part(s) linked to this document
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 2, textAlign: 'left', padding: '8px 10px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>#</th>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 2, textAlign: 'left', padding: '8px 10px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Part Number</th>
                          <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 2, textAlign: 'left', padding: '8px 10px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Description</th>
                          {previewDoc.document_part_numbers?.some((p: any) => p.mpn) && (
                            <th style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 2, textAlign: 'left', padding: '8px 10px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>MPN</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {previewDoc.document_part_numbers?.map((p: any, idx: number) => (
                          <tr key={p.id} style={{ transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: '30px' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', borderBottom: '1px solid var(--border)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{p.part_number}</td>
                            <td style={{ padding: '6px 10px', fontSize: '12px', borderBottom: '1px solid var(--border)' }}>{p.description || '-'}</td>
                            {previewDoc.document_part_numbers?.some((pp: any) => pp.mpn) && (
                              <td style={{ padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', borderBottom: '1px solid var(--border)', color: '#34d399', whiteSpace: 'nowrap' }}>{p.mpn || '-'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!previewDoc.document_part_numbers || previewDoc.document_part_numbers.length === 0) && (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '13px' }}>No parts linked</p>
                    )}
                  </div>
                </div>
              ) : (
              /* File Preview Tab */
              previewLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  Loading preview...
                </div>
              ) : isPreviewable && previewUrl ? (
                previewDoc.file_type.toLowerCase() === 'pdf' ? (
                  <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Preview" />
                ) : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(previewDoc.file_type.toLowerCase()) ? (
                  <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <img src={previewUrl} alt={previewDoc.file_name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                  </div>
                ) : (
                  <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} title="Document Preview" />
                )
              ) : (
                /* Non-previewable file: show metadata */
                <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '16px',
                    background: 'var(--bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText size={32} color="var(--text-secondary)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{previewDoc.file_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      .{previewDoc.file_type.toUpperCase()} · {(previewDoc.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Preview not available for this file type
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={(e) => handleDownload(previewDoc, e)}>
                    <Download size={14} /> Download to View
                  </button>
                </div>
              )
              )}
            </div>

            {/* Preview Footer: metadata */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
            }}>
              <div>Category: <span style={{ color: 'var(--text-primary)' }}>{(previewDoc.document_categories as any)?.name}</span></div>
              <div>Status: <span className={`status-badge status-${previewDoc.status}`} style={{ fontSize: '10px' }}>{previewDoc.status}</span></div>
              <div>Project: <span style={{ color: 'var(--text-primary)' }}>{
                previewDoc.document_projects && previewDoc.document_projects.length > 0
                  ? previewDoc.document_projects.map((p: any) => p.project).join(', ')
                  : previewDoc.project || '-'
              }</span></div>
              <div>Parts: <span style={{ color: 'var(--text-primary)' }}>{previewDoc.document_part_numbers?.length || 0}</span></div>
              <div>Uploaded: <span style={{ color: 'var(--text-primary)' }}>{format(new Date(previewDoc.created_at), 'dd MMM yyyy')}</span></div>
              <div>By: <span style={{ color: 'var(--text-primary)' }}>{(previewDoc.profiles as any)?.full_name || '-'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y} document={ctxMenu.doc}
          onClose={() => setCtxMenu(null)}
          onProperties={() => { setShowProperties(ctxMenu.doc); setCtxMenu(null) }}
          onUploadRevision={() => { setShowRevision(ctxMenu.doc); setCtxMenu(null) }}
          onViewHistory={() => { setShowHistory(ctxMenu.doc); setCtxMenu(null) }}
          onDownload={() => { handleDownload(ctxMenu.doc); setCtxMenu(null) }}
          onVerify={() => { handleVerify(ctxMenu.doc); setCtxMenu(null) }}
          onRelease={() => { handleRelease(ctxMenu.doc); setCtxMenu(null) }}
          onDelete={() => { setConfirmDelete(ctxMenu.doc); setCtxMenu(null) }}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--danger)' }}>Delete Document</h3>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>Are you sure you want to permanently delete this document?</p>
            <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '20px', fontSize: '13px' }}>
              <div><strong>{confirmDelete.document_number}</strong> — {confirmDelete.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Rev: {confirmDelete.current_revision || 'Original'} · Status: {confirmDelete.status}
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '16px' }}>
              This action cannot be undone. All revisions and files will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null) }}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchDocuments} />}
      {showProperties && <PropertiesModal document={showProperties} onClose={() => setShowProperties(null)} onSuccess={fetchDocuments} />}
      {showRevision && <RevisionModal document={showRevision} onClose={() => setShowRevision(null)} onSuccess={fetchDocuments} />}
      {showHistory && <HistoryModal document={showHistory} onClose={() => setShowHistory(null)} />}
    </div>
  )
}

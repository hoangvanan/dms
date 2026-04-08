'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Download, FileText } from 'lucide-react'
import { format } from 'date-fns'
import type { Document, DocumentRevision } from '@/types'

interface HistoryModalProps {
  document: Document
  onClose: () => void
}

export default function HistoryModal({ document: doc, onClose }: HistoryModalProps) {
  const supabase = createClient()
  const [revisions, setRevisions] = useState<DocumentRevision[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('document_revisions')
        .select('*, profiles:uploaded_by(full_name)')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: false })
      if (data) setRevisions(data)
      setLoading(false)
    }
    load()
  }, [doc.id])

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 300)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = fileName
      a.click()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Revision History</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{doc.document_number} — {doc.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Loading...</p>
        ) : revisions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No revision history</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {revisions.map((rev, idx) => (
              <div key={rev.id} style={{
                padding: '12px 16px',
                background: idx === 0 ? 'rgba(79,143,247,0.08)' : 'var(--bg-tertiary)',
                border: idx === 0 ? '1px solid rgba(79,143,247,0.2)' : '1px solid var(--border)',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={14} color="var(--text-secondary)" />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                      {rev.revision || 'Original'}
                    </span>
                    <span className={`status-badge status-${rev.status}`}>{rev.status}</span>
                    {idx === 0 && <span style={{ fontSize: '10px', background: 'var(--accent)', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>CURRENT</span>}
                  </div>
                  <button
                    onClick={() => handleDownload(rev.file_path, rev.file_name)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {rev.file_name} · {(rev.file_size / 1024 / 1024).toFixed(2)} MB
                </div>
                {rev.change_description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {rev.change_description}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Uploaded by {(rev.profiles as any)?.full_name || 'Unknown'} · {format(new Date(rev.created_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

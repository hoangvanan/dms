'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ClipboardList, Search } from 'lucide-react'
import { format } from 'date-fns'
import type { AuditLog } from '@/types'

export default function AuditLogView() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*, profiles:user_id(full_name, email), documents:document_id(document_number, title)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (data) setLogs(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const actionColors: Record<string, string> = {
    upload: '#34d399',
    download: '#60a5fa',
    verify: '#a78bfa',
    release: '#34d399',
    edit_metadata: '#fbbf24',
    revision_upload: '#fb923c',
    archive: '#9ca3af',
    view: '#9aa0b2',
    user_created: '#60a5fa',
    user_updated: '#fbbf24',
  }

  const filtered = filter
    ? logs.filter(l =>
        l.action.includes(filter.toLowerCase()) ||
        (l.profiles as any)?.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
        (l.documents as any)?.document_number?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} /> Audit Log
        </h2>
        <div style={{ marginTop: '12px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Filter by user, action, or document..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ paddingLeft: '32px', maxWidth: '400px' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Timestamp</th>
              <th style={{ width: '160px' }}>User</th>
              <th style={{ width: '130px' }}>Action</th>
              <th style={{ width: '140px' }}>Document</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No audit entries found</td></tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id} style={{ cursor: 'default' }}>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {(log.profiles as any)?.full_name || 'System'}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: `${actionColors[log.action] || '#9aa0b2'}20`,
                      color: actionColors[log.action] || '#9aa0b2',
                      textTransform: 'uppercase',
                    }}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {(log.documents as any)?.document_number || '-'}
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

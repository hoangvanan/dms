'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'
import { FileSearch, Upload, History, Download, CheckCircle, Unlock, Trash2 } from 'lucide-react'
import type { Document } from '@/types'

interface ContextMenuProps {
  x: number
  y: number
  document: Document
  onClose: () => void
  onProperties: () => void
  onUploadRevision: () => void
  onViewHistory: () => void
  onDownload: () => void
  onVerify: () => void
  onRelease: () => void
  onDelete: () => void
}

export default function ContextMenu({
  x, y, document: doc, onClose,
  onProperties, onUploadRevision, onViewHistory, onDownload,
  onVerify, onRelease, onDelete,
}: ContextMenuProps) {
  const { profile } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 300)

  const isAdmin = profile?.role === 'admin'
  const isDatasheet = (doc.document_categories as any)?.name === 'Datasheet'
  const canVerify = canEdit && doc.status === 'processing'
  // Admin can always release; Datasheet: editors can self-release; Others: 4-eyes rule
  const canRelease = canEdit && doc.status === 'verification' && (isAdmin || isDatasheet || doc.verified_by !== profile?.id)
  const isEditorBlocked = !isAdmin && !isDatasheet && doc.status === 'verification' && doc.verified_by === profile?.id
  const canUploadRev = canEdit && doc.status === 'released'

  return (
    <div ref={ref} className="context-menu" style={{ left: adjustedX, top: adjustedY }}>
      <div className="context-menu-item" onClick={onProperties}>
        <FileSearch size={14} /> Properties
      </div>
      <div className="context-menu-item" onClick={onViewHistory}>
        <History size={14} /> View History
      </div>
      <div className="context-menu-item" onClick={onDownload}>
        <Download size={14} /> Download
      </div>

      {canEdit && (
        <>
          <div className="context-menu-divider" />

          {canVerify && (
            <div className="context-menu-item" onClick={onVerify}>
              <CheckCircle size={14} color="var(--info)" /> Verify
            </div>
          )}

          {canRelease && (
            <div className="context-menu-item" onClick={onRelease}>
              <Unlock size={14} color="var(--success)" /> Release
            </div>
          )}

          {isEditorBlocked && (
            <div className="context-menu-item" style={{ color: 'var(--text-secondary)', cursor: 'default', opacity: 0.5 }}>
              <Unlock size={14} /> Release (4-eyes: needs different editor)
            </div>
          )}

          {canUploadRev && (
            <div className="context-menu-item" onClick={onUploadRevision}>
              <Upload size={14} color="var(--warning)" /> Upload Revision
            </div>
          )}

          <div className="context-menu-divider" />
          <div className="context-menu-item danger" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </div>
        </>
      )}
    </div>
  )
}

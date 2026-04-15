'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { SpecBlock, BlockType } from '@/types/specs'

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  section_header: 'Section Header',
  subsection_header: 'Subsection Header',
  key_value_table: 'Key-Value Table',
  data_table: 'Data Table',
  image: 'Image',
  text: 'Text',
  page_break: 'Page Break',
  predefined_cover: 'Cover Page',
  predefined_test_conditions: 'Test Conditions',
  predefined_protective: 'Protective Functions',
  predefined_general_indices: 'General Indices',
  predefined_warnings: 'Warnings',
}

const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  section_header: '#3b82f6',
  subsection_header: '#6366f1',
  key_value_table: '#10b981',
  data_table: '#10b981',
  image: '#f59e0b',
  text: '#8b5cf6',
  page_break: '#6b7280',
  predefined_cover: '#ef4444',
  predefined_test_conditions: '#ec4899',
  predefined_protective: '#ec4899',
  predefined_general_indices: '#ec4899',
  predefined_warnings: '#ec4899',
}

interface BlockContainerProps {
  block: SpecBlock
  number: string
  isLocked: boolean  // released specs
  onUpdate: (blockId: string, content: any) => void
  onDelete: (blockId: string) => void
  children: React.ReactNode  // block type editor (placeholder for now)
}

export default function BlockContainer({
  block, number, isLocked, onUpdate, onDelete, children
}: BlockContainerProps) {
  const [collapsed, setCollapsed] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.block_id, disabled: isLocked })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isCoverPage = block.block_type === 'predefined_cover'
  const typeColor = BLOCK_TYPE_COLORS[block.block_type] || '#6b7280'

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: '1px solid var(--border)',
        borderRadius: '8px',
        background: 'var(--bg-secondary)',
        marginBottom: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Block Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          background: isDragging ? 'rgba(79,143,247,0.08)' : 'transparent',
        }}
      >
        {/* Drag Handle */}
        {!isLocked && !isCoverPage && (
          <button
            {...attributes}
            {...listeners}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'grab', padding: '2px', display: 'flex',
            }}
          >
            <GripVertical size={16} />
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '2px', display: 'flex',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Number */}
        {number && (
          <span style={{
            fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
            minWidth: '28px',
          }}>
            {number}
          </span>
        )}

        {/* Type Badge */}
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
          background: `${typeColor}20`, color: typeColor, textTransform: 'uppercase',
          letterSpacing: '0.3px', whiteSpace: 'nowrap',
        }}>
          {BLOCK_TYPE_LABELS[block.block_type]}
        </span>

        {/* Block Title Preview (for headers) */}
        {(block.block_type === 'section_header' || block.block_type === 'subsection_header') && (
          <span style={{
            fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {(block.content as any)?.title || ''}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Delete Button */}
        {!isLocked && !isCoverPage && (
          <button
            onClick={() => onDelete(block.block_id)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px',
            }}
            title="Delete block"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Block Content (editor) */}
      {!collapsed && (
        <div style={{ padding: '12px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

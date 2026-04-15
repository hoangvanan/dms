'use client'
import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import type { BlockType } from '@/types/specs'

interface AddBlockMenuProps {
  onAdd: (blockType: BlockType) => void
  disabled: boolean
}

const STANDARD_BLOCKS: { type: BlockType; label: string }[] = [
  { type: 'section_header', label: 'Section Header' },
  { type: 'subsection_header', label: 'Subsection Header' },
  { type: 'key_value_table', label: 'Key-Value Table' },
  { type: 'data_table', label: 'Data Table' },
  { type: 'image', label: 'Image' },
  { type: 'text', label: 'Text' },
  { type: 'page_break', label: 'Page Break' },
]

const PREDEFINED_BLOCKS: { type: BlockType; label: string }[] = [
  { type: 'predefined_test_conditions', label: 'Test Conditions' },
  { type: 'predefined_protective', label: 'Protective Functions' },
  { type: 'predefined_general_indices', label: 'General Indices' },
  { type: 'predefined_warnings', label: 'Warnings' },
]

export default function AddBlockMenu({ onAdd, disabled }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (type: BlockType) => {
    onAdd(type)
    setOpen(false)
  }

  const itemStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    width: '100%',
    padding: '7px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', borderRadius: '6px',
          border: '1px dashed var(--border)', background: 'transparent',
          color: disabled ? 'var(--text-secondary)' : 'var(--accent)',
          fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Plus size={14} /> Add Block
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '4px 0', minWidth: '200px', zIndex: 50,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 12px 4px',
          }}>
            Standard
          </div>
          {STANDARD_BLOCKS.map(b => (
            <button key={b.type} onClick={() => handleSelect(b.type)} style={itemStyle}>
              {b.label}
            </button>
          ))}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <div style={{
            fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 12px 4px',
          }}>
            Predefined
          </div>
          {PREDEFINED_BLOCKS.map(b => (
            <button key={b.type} onClick={() => handleSelect(b.type)} style={itemStyle}>
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

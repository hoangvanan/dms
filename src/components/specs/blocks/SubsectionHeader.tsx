'use client'
import type { SubsectionHeaderContent } from '@/types/specs'

interface Props {
  content: SubsectionHeaderContent
  onChange: (content: SubsectionHeaderContent) => void
  disabled: boolean
}

export default function SubsectionHeaderEditor({ content, onChange, disabled }: Props) {
  return (
    <input
      value={content.title || ''}
      onChange={(e) => onChange({ ...content, title: e.target.value })}
      placeholder="Subsection title..."
      disabled={disabled}
      style={{
        width: '100%', padding: '6px 8px', borderRadius: '4px',
        border: '1px solid var(--border)', background: 'var(--bg-primary)',
        color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
        outline: 'none', opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

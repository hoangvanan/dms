'use client'
import type { SectionHeaderContent } from '@/types/specs'

interface Props {
  content: SectionHeaderContent
  onChange: (content: SectionHeaderContent) => void
  disabled: boolean
}

export default function SectionHeaderEditor({ content, onChange, disabled }: Props) {
  return (
    <input
      value={content.title || ''}
      onChange={(e) => onChange({ ...content, title: e.target.value })}
      placeholder="Section title..."
      disabled={disabled}
      style={{
        width: '100%', padding: '6px 8px', borderRadius: '4px',
        border: '1px solid var(--border)', background: 'var(--bg-primary)',
        color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600,
        outline: 'none', opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}

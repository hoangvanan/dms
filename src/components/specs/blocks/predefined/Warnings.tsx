'use client'
import type { PredefinedWarningsContent } from '@/types/specs'

interface Props {
  content: PredefinedWarningsContent
  onChange: (content: PredefinedWarningsContent) => void
  disabled: boolean
}

export default function WarningsEditor({ content, onChange, disabled }: Props) {
  return (
    <div>
      <div style={{
        fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px',
      }}>
        Standard battery safety warning text. Edit as needed.
      </div>
      <textarea
        value={content.text || ''}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        placeholder="Enter warning text..."
        disabled={disabled}
        rows={6}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: '4px',
          border: '1px solid var(--border)', background: 'var(--bg-primary)',
          color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
          resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5',
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  )
}

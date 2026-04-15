'use client'
import { ImageIcon } from 'lucide-react'
import type { ImageContent } from '@/types/specs'

interface Props {
  content: ImageContent
  onChange: (content: ImageContent) => void
  disabled: boolean
}

export default function ImageBlockEditor({ content, onChange, disabled }: Props) {
  return (
    <div>
      {/* Asset ID (placeholder — Task 8 will add asset picker) */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Asset ID
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={content.asset_id || ''}
            onChange={(e) => onChange({ ...content, asset_id: e.target.value })}
            placeholder="Asset ID (or use Asset Library)"
            disabled={disabled}
            style={{
              flex: 1, padding: '5px 8px', borderRadius: '4px',
              border: '1px solid var(--border)', background: 'var(--bg-primary)',
              color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
            }}
          />
          <button
            disabled
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '4px',
              border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)', fontSize: '11px', cursor: 'not-allowed',
              opacity: 0.5,
            }}
            title="Asset Library (Task 8)"
          >
            <ImageIcon size={12} /> Browse
          </button>
        </div>
      </div>

      {/* Width slider */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Width: {content.width_percent || 100}%
        </label>
        <input
          type="range"
          min={25}
          max={100}
          step={5}
          value={content.width_percent || 100}
          onChange={(e) => onChange({ ...content, width_percent: parseInt(e.target.value) })}
          disabled={disabled}
          style={{ width: '200px' }}
        />
      </div>

      {/* Caption */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Caption
        </label>
        <input
          value={content.caption || ''}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
          placeholder="Optional caption"
          disabled={disabled}
          style={{
            width: '100%', padding: '5px 8px', borderRadius: '4px',
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
            color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
          }}
        />
      </div>

      {/* Preview area */}
      {!content.asset_id && (
        <div style={{
          marginTop: '10px', padding: '24px', borderRadius: '6px',
          border: '2px dashed var(--border)', textAlign: 'center',
          color: 'var(--text-secondary)', fontSize: '12px',
        }}>
          <ImageIcon size={24} style={{ marginBottom: '6px', opacity: 0.4 }} />
          <div>No image selected</div>
        </div>
      )}
    </div>
  )
}

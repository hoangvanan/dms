'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { PredefinedProtectiveContent, ProtectiveItem } from '@/types/specs'

interface Props {
  content: PredefinedProtectiveContent
  onChange: (content: PredefinedProtectiveContent) => void
  disabled: boolean
}

export default function ProtectiveFunctionsEditor({ content, onChange, disabled }: Props) {
  const items = content.items || []

  const updateItem = (index: number, field: keyof ProtectiveItem, value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onChange({ ...content, items: updated })
  }

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { type: '', description: '', threshold: '' }],
    })
  }

  const removeItem = (index: number) => {
    onChange({ ...content, items: items.filter((_, i) => i !== index) })
  }

  const inputStyle = {
    padding: '5px 8px',
    borderRadius: '3px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 8px 4px', width: '25%' }}>Type</th>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 8px 4px', width: '45%' }}>Description</th>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 8px 4px', width: '25%' }}>Threshold</th>
            {!disabled && <th style={{ width: '32px' }} />}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ paddingRight: '4px' }}>
                <input
                  value={item.type}
                  onChange={(e) => updateItem(i, 'type', e.target.value)}
                  placeholder="e.g. Output OV"
                  disabled={disabled}
                  style={inputStyle}
                />
              </td>
              <td style={{ paddingRight: '4px' }}>
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Description..."
                  disabled={disabled}
                  style={inputStyle}
                />
              </td>
              <td style={{ paddingRight: '4px' }}>
                <input
                  value={item.threshold}
                  onChange={(e) => updateItem(i, 'threshold', e.target.value)}
                  placeholder="e.g. 59.8V"
                  disabled={disabled}
                  style={inputStyle}
                />
              </td>
              {!disabled && (
                <td>
                  <button
                    onClick={() => removeItem(i)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      cursor: 'pointer', padding: '4px', display: 'flex',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          No protective functions defined yet.
        </div>
      )}

      {!disabled && (
        <button
          onClick={addItem}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px',
            padding: '4px 8px', border: 'none', background: 'none',
            color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add Protective Function
        </button>
      )}
    </div>
  )
}

'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { KeyValueTableContent, KeyValueRow } from '@/types/specs'

interface Props {
  content: KeyValueTableContent
  onChange: (content: KeyValueTableContent) => void
  disabled: boolean
}

export default function KeyValueTableEditor({ content, onChange, disabled }: Props) {
  const rows = content.rows || []

  const updateRow = (index: number, field: keyof KeyValueRow, value: string) => {
    const updated = rows.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    )
    onChange({ ...content, rows: updated })
  }

  const addRow = () => {
    onChange({ ...content, rows: [...rows, { label: '', value: '' }] })
  }

  const removeRow = (index: number) => {
    onChange({ ...content, rows: rows.filter((_, i) => i !== index) })
  }

  const cellStyle = {
    padding: '5px 8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    borderRadius: '3px',
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 2px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 8px 4px', width: '40%' }}>Label</th>
            <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 8px 4px' }}>Value</th>
            {!disabled && <th style={{ width: '32px' }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td style={{ paddingRight: '4px' }}>
                <input
                  value={row.label}
                  onChange={(e) => updateRow(i, 'label', e.target.value)}
                  placeholder="Label"
                  disabled={disabled}
                  style={{ ...cellStyle, width: '100%' }}
                />
              </td>
              <td style={{ paddingRight: '4px' }}>
                <input
                  value={row.value}
                  onChange={(e) => updateRow(i, 'value', e.target.value)}
                  placeholder="Value"
                  disabled={disabled}
                  style={{ ...cellStyle, width: '100%' }}
                />
              </td>
              {!disabled && (
                <td>
                  <button
                    onClick={() => removeRow(i)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      cursor: 'pointer', padding: '4px', display: 'flex',
                    }}
                    title="Remove row"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <button
          onClick={addRow}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px',
            padding: '4px 8px', border: 'none', background: 'none',
            color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add Row
        </button>
      )}
    </div>
  )
}

'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { DataTableContent } from '@/types/specs'

interface Props {
  content: DataTableContent
  onChange: (content: DataTableContent) => void
  disabled: boolean
}

export default function DataTableEditor({ content, onChange, disabled }: Props) {
  const columns = content.columns || ['Column 1']
  const rows = content.rows || [['']]

  const updateColumnHeader = (colIndex: number, value: string) => {
    const updated = columns.map((c, i) => (i === colIndex ? value : c))
    onChange({ ...content, columns: updated })
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updated = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row
    )
    onChange({ ...content, rows: updated })
  }

  const addColumn = () => {
    const newCols = [...columns, `Column ${columns.length + 1}`]
    const newRows = rows.map(row => [...row, ''])
    onChange({ ...content, columns: newCols, rows: newRows })
  }

  const removeColumn = (colIndex: number) => {
    if (columns.length <= 1) return
    const newCols = columns.filter((_, i) => i !== colIndex)
    const newRows = rows.map(row => row.filter((_, i) => i !== colIndex))
    onChange({ ...content, columns: newCols, rows: newRows })
  }

  const addRow = () => {
    const newRow = columns.map(() => '')
    onChange({ ...content, rows: [...rows, newRow] })
  }

  const removeRow = (rowIndex: number) => {
    onChange({ ...content, rows: rows.filter((_, i) => i !== rowIndex) })
  }

  const cellStyle = {
    padding: '4px 6px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    width: '100%',
    borderRadius: '3px',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '2px' }}>
        {/* Column Headers */}
        <thead>
          <tr>
            {columns.map((col, ci) => (
              <th key={ci} style={{ position: 'relative', minWidth: '100px' }}>
                <input
                  value={col}
                  onChange={(e) => updateColumnHeader(ci, e.target.value)}
                  disabled={disabled}
                  style={{
                    ...cellStyle,
                    fontWeight: 600,
                    background: 'var(--bg-tertiary)',
                  }}
                />
                {!disabled && columns.length > 1 && (
                  <button
                    onClick={() => removeColumn(ci)}
                    style={{
                      position: 'absolute', top: '-2px', right: '-2px',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      borderRadius: '50%', width: '16px', height: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--text-secondary)', padding: 0,
                    }}
                    title="Remove column"
                  >
                    <Trash2 size={9} />
                  </button>
                )}
              </th>
            ))}
            {!disabled && <th style={{ width: '32px' }} />}
          </tr>
        </thead>
        {/* Data Rows */}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  <input
                    value={cell}
                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                    disabled={disabled}
                    style={cellStyle}
                  />
                </td>
              ))}
              {!disabled && (
                <td>
                  <button
                    onClick={() => removeRow(ri)}
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
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          <button
            onClick={addRow}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', border: 'none', background: 'none',
              color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add Row
          </button>
          <button
            onClick={addColumn}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', border: 'none', background: 'none',
              color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add Column
          </button>
        </div>
      )}
    </div>
  )
}

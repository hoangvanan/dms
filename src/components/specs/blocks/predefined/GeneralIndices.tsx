'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { PredefinedGeneralIndicesContent, GeneralIndexClause } from '@/types/specs'

interface Props {
  content: PredefinedGeneralIndicesContent
  onChange: (content: PredefinedGeneralIndicesContent) => void
  disabled: boolean
}

export default function GeneralIndicesEditor({ content, onChange, disabled }: Props) {
  const clauses = content.clauses || []

  const updateClause = (index: number, field: keyof GeneralIndexClause, value: any) => {
    const updated = clauses.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    )
    onChange({ ...content, clauses: updated })
  }

  const addClause = () => {
    const nextId = clauses.length > 0
      ? String(parseFloat(clauses[clauses.length - 1].id) + 0.1).substring(0, 3)
      : '7.1'
    onChange({
      ...content,
      clauses: [...clauses, { id: nextId, text: '', enabled: true }],
    })
  }

  const removeClause = (index: number) => {
    onChange({ ...content, clauses: clauses.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {clauses.map((clause, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              padding: '6px 8px', borderRadius: '6px',
              background: clause.enabled ? 'transparent' : 'rgba(107,114,128,0.08)',
              border: '1px solid var(--border)',
              opacity: clause.enabled ? 1 : 0.6,
            }}
          >
            {/* Enable toggle */}
            <div style={{ flexShrink: 0, paddingTop: '4px' }}>
              <input
                type="checkbox"
                checked={clause.enabled}
                onChange={(e) => updateClause(i, 'enabled', e.target.checked)}
                disabled={disabled}
                style={{ margin: 0, cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
            </div>

            {/* Clause ID */}
            <input
              value={clause.id}
              onChange={(e) => updateClause(i, 'id', e.target.value)}
              disabled={disabled}
              style={{
                width: '50px', minWidth: '50px', flexShrink: 0,
                padding: '4px 6px', borderRadius: '3px',
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600,
                outline: 'none', textAlign: 'center',
              }}
            />

            {/* Clause text */}
            <textarea
              value={clause.text}
              onChange={(e) => updateClause(i, 'text', e.target.value)}
              placeholder="Clause text..."
              disabled={disabled}
              rows={2}
              style={{
                flex: 1, minWidth: 0, padding: '4px 8px', borderRadius: '3px',
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.4',
              }}
            />

            {/* Delete */}
            {!disabled && (
              <button
                onClick={() => removeClause(i)}
                style={{
                  flexShrink: 0, background: 'none', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  padding: '4px', display: 'flex', marginTop: '2px',
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {clauses.length === 0 && (
        <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
          No clauses defined yet.
        </div>
      )}

      {!disabled && (
        <button
          onClick={addClause}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px',
            padding: '4px 8px', border: 'none', background: 'none',
            color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add Clause
        </button>
      )}
    </div>
  )
}

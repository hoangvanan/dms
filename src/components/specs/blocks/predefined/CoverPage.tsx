'use client'
import { useState, useEffect } from 'react'
import type { SpecVariantFull, SpecContacts } from '@/types/specs'
import { resolveContacts, formatSpecDate } from '@/lib/spec-helpers'

interface Props {
  variant: SpecVariantFull | null
  disabled: boolean
  onVariantFieldChange?: (fields: { spec_date?: string; contacts_override?: SpecContacts; customer_part_no?: string | null }) => void
}

export default function CoverPageEditor({ variant, disabled, onVariantFieldChange }: Props) {
  const [editingDate, setEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [customerPartNo, setCustomerPartNo] = useState('')
  const [contacts, setContacts] = useState<SpecContacts>({})

  // Sync local state when variant loads/changes
  useEffect(() => {
    if (!variant) return
    setDateValue(variant.spec_date || '')
    setCustomerPartNo(variant.customer_part_no || '')
    const resolved = resolveContacts(variant, variant.spec_customers ?? null)
    setContacts(resolved)
  }, [variant])

  if (!variant) {
    return (
      <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Loading variant data...
      </div>
    )
  }

  const customer = variant.spec_customers

  const handleDateSave = () => {
    setEditingDate(false)
    if (onVariantFieldChange) {
      onVariantFieldChange({ spec_date: dateValue || undefined })
    }
  }

  const handleContactChange = (field: keyof SpecContacts, value: string) => {
    const updated = { ...contacts, [field]: value }
    setContacts(updated)
    if (onVariantFieldChange) {
      onVariantFieldChange({ contacts_override: updated })
    }
  }

  const fieldStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    padding: '4px 0',
    fontSize: '12px',
    borderBottom: '1px solid var(--border)',
    minHeight: '30px',
  }

  const labelStyle = {
    width: '140px',
    minWidth: '140px',
    color: 'var(--text-secondary)',
    fontWeight: 500 as const,
  }

  const valueStyle = {
    color: 'var(--text-primary)',
    flex: 1,
  }

  const editableInputStyle = {
    width: '100%',
    padding: '3px 6px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  }

  const readOnlyField = (label: string, value: string) => (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value || '—'}</span>
    </div>
  )

  const editableContactField = (label: string, field: keyof SpecContacts) => (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={{ flex: 1 }}>
        {disabled ? (
          <span style={valueStyle}>{contacts[field] || '—'}</span>
        ) : (
          <input
            value={contacts[field] || ''}
            onChange={(e) => handleContactChange(field, e.target.value)}
            placeholder="—"
            style={editableInputStyle}
          />
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{
        fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px',
        padding: '6px 10px', background: 'rgba(59,130,246,0.08)', borderRadius: '6px',
        border: '1px solid rgba(59,130,246,0.15)',
      }}>
        Cover Page is auto-generated from variant metadata. Date, Customer Part No., and Contacts can be edited below.
      </div>

      {/* Variant Info */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Document Info
        </div>
        {readOnlyField('Customer', customer?.name || '')}
        {readOnlyField('Type Designation', variant.type_designation)}
        {readOnlyField('UMEVS Part No.', variant.umevs_part_no)}

        {/* Customer Part No — editable */}
        <div style={fieldStyle}>
          <span style={labelStyle}>Customer Part No.</span>
          <div style={{ flex: 1 }}>
            {disabled ? (
              <span style={valueStyle}>{variant.customer_part_no || '—'}</span>
            ) : (
              <input
                value={customerPartNo}
                onChange={(e) => {
                  setCustomerPartNo(e.target.value)
                  if (onVariantFieldChange) {
                    onVariantFieldChange({ customer_part_no: e.target.value.trim() || null })
                  }
                }}
                placeholder="—"
                style={editableInputStyle}
              />
            )}
          </div>
        </div>

        {/* Date — editable */}
        <div style={fieldStyle}>
          <span style={labelStyle}>Date</span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {disabled ? (
              <span style={valueStyle}>{formatSpecDate(variant.spec_date)}</span>
            ) : editingDate ? (
              <>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  onBlur={handleDateSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDateSave() }}
                  autoFocus
                  style={{ ...editableInputStyle, width: '160px' }}
                />
              </>
            ) : (
              <span
                onClick={() => setEditingDate(true)}
                style={{
                  ...valueStyle,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: '1px dashed transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                title="Click to edit"
              >
                {formatSpecDate(dateValue) || '—'}
              </span>
            )}
          </div>
        </div>

        {readOnlyField('Index / Rev.', variant.current_index_rev || 'Original')}
      </div>

      {/* Contacts — editable */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Contacts
        </div>
        {editableContactField('Sales', 'sales')}
        {editableContactField('Mech. Engineering', 'mech_eng')}
        {editableContactField('Elec. Engineering', 'elec_eng')}
        {editableContactField('Doc. Engineering', 'doc_eng')}
        {editableContactField('Approved', 'approver')}
      </div>
    </div>
  )
}

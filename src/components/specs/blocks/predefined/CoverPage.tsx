'use client'
import type { SpecVariantFull, SpecContacts } from '@/types/specs'
import { resolveContacts, formatSpecDate } from '@/lib/spec-helpers'

interface Props {
  variant: SpecVariantFull | null
  disabled: boolean
}

export default function CoverPageEditor({ variant, disabled }: Props) {
  if (!variant) {
    return (
      <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Loading variant data...
      </div>
    )
  }

  const customer = variant.spec_customers
  const contacts: SpecContacts = resolveContacts(variant, customer ?? null)

  const fieldStyle = {
    display: 'flex' as const,
    gap: '8px',
    padding: '4px 0',
    fontSize: '12px',
    borderBottom: '1px solid var(--border)',
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

  return (
    <div>
      <div style={{
        fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px',
        padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px',
        border: '1px solid rgba(239,68,68,0.15)',
      }}>
        Cover Page is auto-generated from variant metadata. Edit variant details to change cover page content.
      </div>

      {/* Variant Info */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Document Info
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Customer</span>
          <span style={valueStyle}>{customer?.name || '—'}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Type Designation</span>
          <span style={valueStyle}>{variant.type_designation}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>UMEVS Part No.</span>
          <span style={valueStyle}>{variant.umevs_part_no}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Customer Part No.</span>
          <span style={valueStyle}>{variant.customer_part_no || '—'}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Date</span>
          <span style={valueStyle}>{formatSpecDate(variant.spec_date)}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Index / Rev.</span>
          <span style={valueStyle}>{variant.current_index_rev || 'Original'}</span>
        </div>
      </div>

      {/* Contacts */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Contacts
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Sales</span>
          <span style={valueStyle}>{contacts.sales || '—'}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Mech. Engineering</span>
          <span style={valueStyle}>{contacts.mech_eng || '—'}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Elec. Engineering</span>
          <span style={valueStyle}>{contacts.elec_eng || '—'}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Doc. Engineering</span>
          <span style={valueStyle}>{contacts.doc_eng || '—'}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Approved</span>
          <span style={valueStyle}>{contacts.approver || '—'}</span>
        </div>
      </div>
    </div>
  )
}

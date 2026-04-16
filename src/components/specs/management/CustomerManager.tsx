'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, X, Search, Loader2, Power } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '../../Toast'
import type { SpecCustomer, SpecContacts } from '@/types/specs'

// ============================================================================
// Form state
// ============================================================================

interface CustomerFormState {
  name: string
  brand_name: string
  sales: string
  mech_eng: string
  elec_eng: string
  doc_eng: string
  approver: string
}

const EMPTY_FORM: CustomerFormState = {
  name: '',
  brand_name: '',
  sales: '',
  mech_eng: '',
  elec_eng: '',
  doc_eng: '',
  approver: '',
}

function customerToForm(c: SpecCustomer): CustomerFormState {
  const contacts = c.default_contacts || {}
  return {
    name: c.name || '',
    brand_name: c.brand_name || '',
    sales: contacts.sales || '',
    mech_eng: contacts.mech_eng || '',
    elec_eng: contacts.elec_eng || '',
    doc_eng: contacts.doc_eng || '',
    approver: contacts.approver || '',
  }
}

function formToPayload(f: CustomerFormState) {
  const strOrNull = (v: string) => (v.trim() ? v.trim() : null)

  // Build contacts JSONB — only include non-empty fields
  const contacts: SpecContacts = {}
  if (f.sales.trim()) contacts.sales = f.sales.trim()
  if (f.mech_eng.trim()) contacts.mech_eng = f.mech_eng.trim()
  if (f.elec_eng.trim()) contacts.elec_eng = f.elec_eng.trim()
  if (f.doc_eng.trim()) contacts.doc_eng = f.doc_eng.trim()
  if (f.approver.trim()) contacts.approver = f.approver.trim()

  return {
    name: f.name.trim(),
    brand_name: strOrNull(f.brand_name),
    default_contacts: Object.keys(contacts).length > 0 ? contacts : null,
  }
}

// ============================================================================
// Form Modal
// ============================================================================

interface FormModalProps {
  customer: SpecCustomer | null
  onClose: () => void
  onSaved: () => void
}

function CustomerFormModal({ customer, onClose, onSaved }: FormModalProps) {
  const [form, setForm] = useState<CustomerFormState>(
    customer ? customerToForm(customer) : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const isEdit = !!customer

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Customer Name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const payload = formToPayload(form)

      if (isEdit) {
        const { error } = await supabase
          .from('spec_customers')
          .update(payload)
          .eq('customer_id', customer!.customer_id)
        if (error) throw error
        showToast('Customer updated', 'success')
      } else {
        const { error } = await supabase
          .from('spec_customers')
          .insert({ ...payload, is_active: true })
        if (error) throw error
        showToast('Customer created', 'success')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof CustomerFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '6px',
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
  }

  const labelStyle = {
    fontSize: '11px', fontWeight: 600 as const, color: 'var(--text-secondary)',
    marginBottom: '3px', display: 'block' as const,
  }

  const sectionStyle = {
    fontSize: '11px', fontWeight: 600 as const, color: 'var(--accent)',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
    margin: '14px 0 8px', padding: '0',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Edit Customer' : 'New Customer'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={sectionStyle}>Basic Information</div>
          <div>
            <label style={labelStyle}>Customer Name *</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Hero MotoCorp Ltd."
              style={inputStyle}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={labelStyle}>Brand Name</label>
            <input
              value={form.brand_name}
              onChange={(e) => update('brand_name', e.target.value)}
              placeholder="e.g. VIDA"
              style={inputStyle}
            />
          </div>

          <div style={sectionStyle}>Default Contacts</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            These contacts will appear on spec cover pages unless overridden per spec.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Sales</label>
              <input value={form.sales} onChange={(e) => update('sales', e.target.value)} placeholder="Contact name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mechanical Engineering</label>
              <input value={form.mech_eng} onChange={(e) => update('mech_eng', e.target.value)} placeholder="Contact name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Electrical Engineering</label>
              <input value={form.elec_eng} onChange={(e) => update('elec_eng', e.target.value)} placeholder="Contact name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Documentation Engineering</label>
              <input value={form.doc_eng} onChange={(e) => update('doc_eng', e.target.value)} placeholder="Contact name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Approver</label>
              <input value={form.approver} onChange={(e) => update('approver', e.target.value)} placeholder="Contact name" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: '12px',
              fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Customer')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main CustomerManager Component
// ============================================================================

export default function CustomerManager() {
  const [customers, setCustomers] = useState<SpecCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editCustomer, setEditCustomer] = useState<SpecCustomer | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('spec_customers')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setCustomers(data || [])
    } catch (err: any) {
      showToast(err.message || 'Failed to load customers', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleActive = async (customer: SpecCustomer) => {
    const nextState = !customer.is_active
    const msg = nextState
      ? `Activate "${customer.name}"?`
      : `Deactivate "${customer.name}"?\n\nIt will be hidden from the customer dropdown when creating new specs. Existing specs using this customer are not affected.`
    if (!window.confirm(msg)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_customers')
        .update({ is_active: nextState })
        .eq('customer_id', customer.customer_id)
      if (error) throw error
      showToast(`Customer ${nextState ? 'activated' : 'deactivated'}`, 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error')
    }
  }

  const filtered = customers.filter(c => {
    if (!showInactive && !c.is_active) return false
    if (search) {
      const term = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(term) ||
        (c.brand_name || '').toLowerCase().includes(term)
      )
    }
    return true
  })

  const contactSummary = (c: SpecCustomer) => {
    const contacts = c.default_contacts || {}
    const count = Object.values(contacts).filter(v => v && String(v).trim()).length
    return count > 0 ? `${count} contact${count > 1 ? 's' : ''}` : '—'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Customers</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditCustomer(null); setShowForm(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      {/* Filters */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', gap: '12px', alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            style={{
              width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
            }}
          />
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {search ? 'No customers match your search.' : 'No customers yet. Click "New Customer" to create one.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <thead>
              <tr>
                {['Name', 'Brand', 'Contacts', 'Status', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
                    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                    ...(h === 'Status' ? { width: '90px' } : {}),
                    ...(h === '' ? { width: '90px' } : {}),
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.customer_id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: c.is_active ? 1 : 0.5,
                  }}
                >
                  <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>{c.brand_name || '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {contactSummary(c)}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '12px',
                      background: c.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                      color: c.is_active ? '#10b981' : '#6b7280',
                    }}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setEditCustomer(c); setShowForm(true) }}
                        title="Edit"
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-secondary)',
                          cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(c)}
                        title={c.is_active ? 'Deactivate' : 'Activate'}
                        style={{
                          background: 'none', border: 'none',
                          color: c.is_active ? '#ef4444' : '#10b981',
                          cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px',
                        }}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <CustomerFormModal
          customer={editCustomer}
          onClose={() => { setShowForm(false); setEditCustomer(null) }}
          onSaved={loadData}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

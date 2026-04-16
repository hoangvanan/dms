'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, X, Search, Loader2, Power } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '../../Toast'
import type { SpecProduct } from '@/types/specs'

// ============================================================================
// Form state type — strings everywhere for controlled inputs
// ============================================================================

interface ProductFormState {
  product_family: string
  description: string
  cell_config: string
  nominal_cell_voltage: string
  max_charge_current: string
  max_output_power: string
  housing_material: string
  ip_rating: string
  protection_class: string
  weight_grams: string
  weight_tolerance: string
  default_input_voltage: string
  default_input_frequency: string
  default_efficiency: string
  default_power_factor: string
}

const EMPTY_FORM: ProductFormState = {
  product_family: '',
  description: '',
  cell_config: '',
  nominal_cell_voltage: '',
  max_charge_current: '',
  max_output_power: '',
  housing_material: '',
  ip_rating: '',
  protection_class: '',
  weight_grams: '',
  weight_tolerance: '',
  default_input_voltage: '',
  default_input_frequency: '',
  default_efficiency: '',
  default_power_factor: '',
}

// ============================================================================
// Helpers
// ============================================================================

function productToForm(p: SpecProduct): ProductFormState {
  return {
    product_family: p.product_family || '',
    description: p.description || '',
    cell_config: p.cell_config || '',
    nominal_cell_voltage: p.nominal_cell_voltage != null ? String(p.nominal_cell_voltage) : '',
    max_charge_current: p.max_charge_current != null ? String(p.max_charge_current) : '',
    max_output_power: p.max_output_power != null ? String(p.max_output_power) : '',
    housing_material: p.housing_material || '',
    ip_rating: p.ip_rating || '',
    protection_class: p.protection_class || '',
    weight_grams: p.weight_grams != null ? String(p.weight_grams) : '',
    weight_tolerance: p.weight_tolerance != null ? String(p.weight_tolerance) : '',
    default_input_voltage: p.default_input_voltage || '',
    default_input_frequency: p.default_input_frequency || '',
    default_efficiency: p.default_efficiency || '',
    default_power_factor: p.default_power_factor || '',
  }
}

function formToPayload(f: ProductFormState) {
  const numOrNull = (v: string) => {
    if (!v.trim()) return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }
  const strOrNull = (v: string) => (v.trim() ? v.trim() : null)
  return {
    product_family: f.product_family.trim(),
    description: strOrNull(f.description),
    cell_config: strOrNull(f.cell_config),
    nominal_cell_voltage: numOrNull(f.nominal_cell_voltage),
    max_charge_current: numOrNull(f.max_charge_current),
    max_output_power: numOrNull(f.max_output_power),
    housing_material: strOrNull(f.housing_material),
    ip_rating: strOrNull(f.ip_rating),
    protection_class: strOrNull(f.protection_class),
    weight_grams: numOrNull(f.weight_grams),
    weight_tolerance: numOrNull(f.weight_tolerance),
    default_input_voltage: strOrNull(f.default_input_voltage),
    default_input_frequency: strOrNull(f.default_input_frequency),
    default_efficiency: strOrNull(f.default_efficiency),
    default_power_factor: strOrNull(f.default_power_factor),
  }
}

// ============================================================================
// Product Form Modal
// ============================================================================

interface FormModalProps {
  product: SpecProduct | null    // null = create, else edit
  onClose: () => void
  onSaved: () => void
}

function ProductFormModal({ product, onClose, onSaved }: FormModalProps) {
  const [form, setForm] = useState<ProductFormState>(
    product ? productToForm(product) : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const isEdit = !!product

  const handleSave = async () => {
    if (!form.product_family.trim()) {
      showToast('Product Family is required', 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const payload = formToPayload(form)

      if (isEdit) {
        const { error } = await supabase
          .from('spec_products')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('product_id', product!.product_id)
        if (error) throw error
        showToast('Product updated', 'success')
      } else {
        const { error } = await supabase
          .from('spec_products')
          .insert({ ...payload, is_active: true })
        if (error) throw error
        showToast('Product created', 'success')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      showToast(err.message || 'Failed to save product', 'error')
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof ProductFormState, value: string) => {
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

  const fieldGroup = (fields: { key: keyof ProductFormState; label: string; placeholder?: string; type?: string }[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {fields.map(f => (
        <div key={f.key}>
          <label style={labelStyle}>{f.label}</label>
          <input
            type={f.type || 'text'}
            value={form[f.key]}
            onChange={(e) => update(f.key, e.target.value)}
            placeholder={f.placeholder}
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Edit Product' : 'New Product'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Basic */}
          <div style={sectionStyle}>Basic Information</div>
          <div>
            <label style={labelStyle}>Product Family *</label>
            <input
              value={form.product_family}
              onChange={(e) => update('product_family', e.target.value)}
              placeholder="e.g. LEV1000"
              style={inputStyle}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Optional product description"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Electrical */}
          <div style={sectionStyle}>Electrical</div>
          {fieldGroup([
            { key: 'cell_config', label: 'Cell Configuration', placeholder: 'e.g. 14S' },
            { key: 'nominal_cell_voltage', label: 'Nominal Cell Voltage (V)', placeholder: 'e.g. 4.2', type: 'number' },
            { key: 'max_charge_current', label: 'Max Charge Current (A)', placeholder: 'e.g. 20', type: 'number' },
            { key: 'max_output_power', label: 'Max Output Power (W)', placeholder: 'e.g. 1000', type: 'number' },
          ])}

          {/* Physical */}
          <div style={sectionStyle}>Physical</div>
          {fieldGroup([
            { key: 'housing_material', label: 'Housing Material', placeholder: 'e.g. Aluminium, Plastic' },
            { key: 'ip_rating', label: 'IP Rating', placeholder: 'e.g. IP65' },
            { key: 'protection_class', label: 'Protection Class', placeholder: 'e.g. I' },
            { key: 'weight_grams', label: 'Weight (g)', placeholder: 'e.g. 4000', type: 'number' },
            { key: 'weight_tolerance', label: 'Weight Tolerance (g)', placeholder: 'e.g. 200', type: 'number' },
          ])}

          {/* Defaults */}
          <div style={sectionStyle}>Defaults (for inheritance)</div>
          {fieldGroup([
            { key: 'default_input_voltage', label: 'Default Input Voltage', placeholder: 'e.g. 190-240Vac' },
            { key: 'default_input_frequency', label: 'Default Input Frequency', placeholder: 'e.g. 50-60Hz' },
            { key: 'default_efficiency', label: 'Default Efficiency', placeholder: 'e.g. ≥92%' },
            { key: 'default_power_factor', label: 'Default Power Factor', placeholder: 'e.g. ≥0.98' },
          ])}
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
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Product')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main ProductManager Component
// ============================================================================

export default function ProductManager() {
  const [products, setProducts] = useState<SpecProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editProduct, setEditProduct] = useState<SpecProduct | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('spec_products')
        .select('*')
        .order('product_family', { ascending: true })
      if (error) throw error
      setProducts(data || [])
    } catch (err: any) {
      showToast(err.message || 'Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleActive = async (product: SpecProduct) => {
    const nextState = !product.is_active
    const msg = nextState
      ? `Activate "${product.product_family}"?`
      : `Deactivate "${product.product_family}"?\n\nIt will be hidden from the product dropdown when creating new specs. Existing specs using this product are not affected.`
    if (!window.confirm(msg)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_products')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('product_id', product.product_id)
      if (error) throw error
      showToast(`Product ${nextState ? 'activated' : 'deactivated'}`, 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error')
    }
  }

  const filtered = products.filter(p => {
    if (!showInactive && !p.is_active) return false
    if (search) {
      const term = search.toLowerCase()
      return (
        p.product_family.toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term)
      )
    }
    return true
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Products</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowForm(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> New Product
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
            placeholder="Search products..."
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
            {search ? 'No products match your search.' : 'No products yet. Click "New Product" to create one.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <thead>
              <tr>
                {['Product Family', 'Cell Config', 'Max Power', 'IP Rating', 'Weight', 'Status', ''].map((h, i) => (
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
              {filtered.map(p => (
                <tr
                  key={p.product_id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: p.is_active ? 1 : 0.5,
                  }}
                >
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.product_family}</div>
                    {p.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>{p.cell_config || '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>
                    {p.max_output_power ? `${p.max_output_power}W` : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>{p.ip_rating || '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>
                    {p.weight_grams ? `${p.weight_grams}g${p.weight_tolerance ? ` ±${p.weight_tolerance}` : ''}` : '—'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '12px',
                      background: p.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                      color: p.is_active ? '#10b981' : '#6b7280',
                    }}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => { setEditProduct(p); setShowForm(true) }}
                        title="Edit"
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-secondary)',
                          cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(p)}
                        title={p.is_active ? 'Deactivate' : 'Activate'}
                        style={{
                          background: 'none', border: 'none',
                          color: p.is_active ? '#ef4444' : '#10b981',
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

      {/* Form Modal */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null) }}
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

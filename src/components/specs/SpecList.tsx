'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthProvider'
import { showToast } from '../Toast'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, MoreVertical, Edit, Copy, FileDown, Download,
  History, CheckCircle, Send, Trash2, X, ChevronDown, FilePlus
} from 'lucide-react'
import type {
  SpecVariant, SpecProduct, SpecCustomer, SpecMarketConfig, SpecStatus,
} from '@/types/specs'
import { fetchSpecVariants, fetchProducts, fetchCustomers, fetchMarketConfigs, getStatusColor, formatSpecDate, cloneVariant, canCreateRevision } from '@/lib/spec-helpers'
import CreateRevisionModal from './blocks/predefined/CreateRevisionModal'
import VersionHistoryModal from './blocks/predefined/VersionHistoryModal'

// ============================================================================
// Create Spec Modal
// ============================================================================

interface CreateModalProps {
  products: SpecProduct[]
  customers: SpecCustomer[]
  marketConfigs: SpecMarketConfig[]
  onClose: () => void
  onCreated: () => void
}

function CreateSpecModal({ products, customers, marketConfigs, onClose, onCreated }: CreateModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    customer_id: '',
    config_id: '',
    umevs_part_no: '',
    customer_part_no: '',
    type_designation: '',
    spec_date: new Date().toISOString().split('T')[0],
  })

  const handleCreate = async () => {
    if (!form.product_id || !form.customer_id || !form.config_id) {
      showToast('Please select Product, Customer, and Market', 'error')
      return
    }
    if (!form.umevs_part_no.trim()) {
      showToast('UMEVS Part No. is required', 'error')
      return
    }
    if (!form.type_designation.trim()) {
      showToast('Type Designation is required', 'error')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('spec_variants')
        .insert({
          product_id: form.product_id,
          customer_id: form.customer_id,
          config_id: form.config_id,
          umevs_part_no: form.umevs_part_no.trim(),
          customer_part_no: form.customer_part_no.trim() || null,
          type_designation: form.type_designation.trim(),
          spec_date: form.spec_date || null,
          status: 'processing',
          override_data: {},
          created_by: profile?.id,
          updated_by: profile?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Auto-insert Cover Page block (always first, cannot be deleted)
      if (data) {
        await supabase.from('spec_blocks').insert({
          variant_id: data.variant_id,
          block_type: 'predefined_cover',
          sort_order: 0,
          content: {},
        })
      }

      showToast('Specification created', 'success')
      onCreated()
      onClose()
    } catch (err: any) {
      console.error('Create spec error:', err)
      showToast(err.message || 'Failed to create specification', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600 as const,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '480px', maxHeight: '90vh', overflow: 'auto', padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>New Specification</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Product */}
          <div>
            <label style={labelStyle}>Product *</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select product...</option>
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_family}{p.max_output_power ? ` (${p.max_output_power}W)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <label style={labelStyle}>Customer *</label>
            <select
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name}{c.brand_name ? ` (${c.brand_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Market */}
          <div>
            <label style={labelStyle}>Market *</label>
            <select
              value={form.config_id}
              onChange={(e) => setForm({ ...form, config_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select market...</option>
              {marketConfigs.map(m => (
                <option key={m.config_id} value={m.config_id}>
                  {m.market_name} ({m.market_code})
                </option>
              ))}
            </select>
          </div>

          {/* Type Designation */}
          <div>
            <label style={labelStyle}>Type Designation *</label>
            <input
              value={form.type_designation}
              onChange={(e) => setForm({ ...form, type_designation: e.target.value })}
              placeholder="e.g. LEV1000/14/4.2/20/IN"
              style={inputStyle}
            />
          </div>

          {/* UMEVS Part No */}
          <div>
            <label style={labelStyle}>UMEVS Part No. *</label>
            <input
              value={form.umevs_part_no}
              onChange={(e) => setForm({ ...form, umevs_part_no: e.target.value })}
              placeholder="e.g. 34CH020016-0001E0"
              style={inputStyle}
            />
          </div>

          {/* Customer Part No */}
          <div>
            <label style={labelStyle}>Customer Part No.</label>
            <input
              value={form.customer_part_no}
              onChange={(e) => setForm({ ...form, customer_part_no: e.target.value })}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>

          {/* Spec Date */}
          <div>
            <label style={labelStyle}>Spec Date</label>
            <input
              type="date"
              value={form.spec_date}
              onChange={(e) => setForm({ ...form, spec_date: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Specification'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Clone Spec Modal
// ============================================================================

interface CloneModalProps {
  sourceVariant: SpecVariant
  products: SpecProduct[]
  customers: SpecCustomer[]
  marketConfigs: SpecMarketConfig[]
  onClose: () => void
  onCloned: (newVariantId: string) => void
}

function CloneSpecModal({ sourceVariant, products, customers, marketConfigs, onClose, onCloned }: CloneModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    product_id: sourceVariant.product_id || '',
    customer_id: sourceVariant.customer_id || '',
    config_id: sourceVariant.config_id || '',
    umevs_part_no: '',
    customer_part_no: '',
    type_designation: sourceVariant.type_designation,
  })

  const handleClone = async () => {
    if (!form.product_id || !form.customer_id || !form.config_id) {
      showToast('Please select Product, Customer, and Market', 'error')
      return
    }
    if (!form.umevs_part_no.trim()) {
      showToast('UMEVS Part No. is required', 'error')
      return
    }
    if (!form.type_designation.trim()) {
      showToast('Type Designation is required', 'error')
      return
    }

    setLoading(true)
    try {
      const newVariantId = await cloneVariant(
        sourceVariant.variant_id,
        {
          product_id: form.product_id,
          customer_id: form.customer_id,
          config_id: form.config_id,
          umevs_part_no: form.umevs_part_no.trim(),
          customer_part_no: form.customer_part_no.trim() || null,
          type_designation: form.type_designation.trim(),
          spec_date: new Date().toISOString().split('T')[0],
        },
        profile!.id
      )
      showToast('Specification cloned successfully', 'success')
      onCloned(newVariantId)
      onClose()
    } catch (err: any) {
      console.error('Clone spec error:', err)
      showToast(err.message || 'Failed to clone specification', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600 as const,
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)',
        width: '480px', maxHeight: '90vh', overflow: 'auto', padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Clone Specification</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Source info */}
        <div style={{
          padding: '10px 12px', borderRadius: '6px', marginBottom: '16px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cloning from</div>
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{sourceVariant.type_designation}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{sourceVariant.umevs_part_no}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Product */}
          <div>
            <label style={labelStyle}>Product *</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select product...</option>
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_family}{p.max_output_power ? ` (${p.max_output_power}W)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <label style={labelStyle}>Customer *</label>
            <select
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name}{c.brand_name ? ` (${c.brand_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Market */}
          <div>
            <label style={labelStyle}>Market *</label>
            <select
              value={form.config_id}
              onChange={(e) => setForm({ ...form, config_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select market...</option>
              {marketConfigs.map(m => (
                <option key={m.config_id} value={m.config_id}>
                  {m.market_name} ({m.market_code})
                </option>
              ))}
            </select>
          </div>

          {/* Type Designation */}
          <div>
            <label style={labelStyle}>Type Designation *</label>
            <input
              value={form.type_designation}
              onChange={(e) => setForm({ ...form, type_designation: e.target.value })}
              placeholder="e.g. LEV1000/14/4.2/20/IN"
              style={inputStyle}
            />
          </div>

          {/* UMEVS Part No */}
          <div>
            <label style={labelStyle}>UMEVS Part No. *</label>
            <input
              value={form.umevs_part_no}
              onChange={(e) => setForm({ ...form, umevs_part_no: e.target.value })}
              placeholder="e.g. 34CH020016-0001E0"
              style={inputStyle}
            />
          </div>

          {/* Customer Part No */}
          <div>
            <label style={labelStyle}>Customer Part No.</label>
            <input
              value={form.customer_part_no}
              onChange={(e) => setForm({ ...form, customer_part_no: e.target.value })}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={loading}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Cloning...' : 'Clone Specification'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Actions Menu (context menu for each row)
// ============================================================================

interface ActionsMenuProps {
  variant: SpecVariant
  position: { top: number; left: number }
  onClose: () => void
  onEdit: () => void
  onClone: () => void
  onRevision: () => void
  onHistory: () => void
  onDelete: () => void
}

function ActionsMenu({ variant, position, onClose, onEdit, onClone, onRevision, onHistory, onDelete }: ActionsMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose()
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [onClose])

  const itemStyle = (disabled: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    width: '100%',
    padding: '7px 12px',
    border: 'none',
    background: 'transparent',
    color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
    fontSize: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textAlign: 'left' as const,
  })

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '4px 0',
        minWidth: '180px',
        zIndex: 200,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      <button onClick={onEdit} style={itemStyle(false)}>
        <Edit size={14} /> Edit
      </button>
      <button onClick={onClone} style={itemStyle(false)}>
        <Copy size={14} /> Clone
      </button>
      <button onClick={onHistory} style={itemStyle(false)}>
        <History size={14} /> Version History
      </button>
      {canCreateRevision(variant).allowed && (
        <button onClick={onRevision} style={itemStyle(false)}>
          <FilePlus size={14} /> Create Revision
        </button>
      )}
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
      <button disabled style={itemStyle(true)}>
        <FileDown size={14} /> Generate PDF
      </button>
      <button disabled style={itemStyle(true)}>
        <Download size={14} /> Download PDF
      </button>
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
      <button disabled style={itemStyle(true)}>
        <CheckCircle size={14} /> Verify
      </button>
      <button disabled style={itemStyle(true)}>
        <Send size={14} /> Release
      </button>
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
      <button
        onClick={onDelete}
        style={{ ...itemStyle(false), color: '#ef4444' }}
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  )
}

// ============================================================================
// Main SpecList Component
// ============================================================================

export default function SpecList({ onEditSpec }: { onEditSpec?: (variantId: string) => void }) {
  const { profile } = useAuth()

  const [variants, setVariants] = useState<SpecVariant[]>([])
  const [products, setProducts] = useState<SpecProduct[]>([])
  const [customers, setCustomers] = useState<SpecCustomer[]>([])
  const [marketConfigs, setMarketConfigs] = useState<SpecMarketConfig[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [cloneSource, setCloneSource] = useState<SpecVariant | null>(null)
  const [revisionSource, setRevisionSource] = useState<SpecVariant | null>(null)
  const [historyVariantId, setHistoryVariantId] = useState<string | null>(null)
  const [actionsMenu, setActionsMenu] = useState<{ variant: SpecVariant; position: { top: number; left: number } } | null>(null)

  const isAdmin = profile?.role === 'admin'

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [v, p, c, m] = await Promise.all([
        fetchSpecVariants({
          search: searchTerm || undefined,
          customerId: filterCustomer || undefined,
          status: (filterStatus as SpecStatus) || undefined,
        }),
        fetchProducts(),
        fetchCustomers(),
        fetchMarketConfigs(),
      ])
      setVariants(v)
      setProducts(p)
      setCustomers(c)
      setMarketConfigs(m)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filterCustomer, filterStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Soft delete
  const handleDelete = async (variant: SpecVariant) => {
    const confirm = window.confirm(`Delete specification "${variant.type_designation}"?\nThis can be undone by admin.`)
    if (!confirm) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_variants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('variant_id', variant.variant_id)

      if (error) throw error
      showToast('Specification deleted', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error')
    }
  }

  // Navigate to editor
  const handleEdit = (variant: SpecVariant) => {
    if (onEditSpec) {
      onEditSpec(variant.variant_id)
    }
  }

  const handleActionsClick = (e: React.MouseEvent, variant: SpecVariant) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setActionsMenu({
      variant,
      position: { top: rect.bottom + 4, left: rect.left - 140 },
    })
  }

  // Get customer/product name helpers
  const getCustomerName = (v: SpecVariant) => {
    const c = v.spec_customers as SpecCustomer | undefined
    return c?.name || '—'
  }

  const getProductFamily = (v: SpecVariant) => {
    const p = v.spec_products as SpecProduct | undefined
    return p?.product_family || '—'
  }

  const getMarketCode = (v: SpecVariant) => {
    const m = v.spec_market_configs as SpecMarketConfig | undefined
    return m?.market_code || '—'
  }

  const selectStyle = {
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Specifications</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {variants.length} specification{variants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> New Specification
        </button>
      </div>

      {/* Filters */}
      <div style={{
        padding: '12px 24px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            placeholder="Search by type, part no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
            }}
          />
        </div>
        <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} style={selectStyle}>
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.customer_id} value={c.customer_id}>{c.name}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All Status</option>
          <option value="processing">Processing</option>
          <option value="verification">Verification</option>
          <option value="released">Released</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Loading...
          </div>
        ) : variants.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {searchTerm || filterCustomer || filterStatus
              ? 'No specifications match your filters.'
              : 'No specifications yet. Click "New Specification" to get started.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <thead>
              <tr>
                {['Type / Part No', 'Product', 'Customer', 'Market', 'Rev', 'Status', 'Date', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
                    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                    ...(h === '' ? { width: '40px' } : {}),
                    ...(h === 'Rev' ? { width: '50px' } : {}),
                    ...(h === 'Status' ? { width: '95px' } : {}),
                    ...(h === 'Date' ? { width: '85px' } : {}),
                    ...(h === 'Market' ? { width: '70px' } : {}),
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map(v => (
                <tr
                  key={v.variant_id}
                  onClick={() => handleEdit(v)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(79,143,247,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Type / Part No */}
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{v.type_designation}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                      {v.umevs_part_no}
                      {v.customer_part_no ? ` · ${v.customer_part_no}` : ''}
                    </div>
                  </td>
                  {/* Product */}
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>{getProductFamily(v)}</td>
                  {/* Customer */}
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>{getCustomerName(v)}</td>
                  {/* Market */}
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                      background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    }}>
                      {getMarketCode(v)}
                    </span>
                  </td>
                  {/* Rev */}
                  <td style={{ padding: '10px 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {v.current_index_rev || '—'}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '12px',
                      background: `${getStatusColor(v.status)}20`, color: getStatusColor(v.status),
                      textTransform: 'capitalize',
                    }}>
                      {v.status}
                    </span>
                  </td>
                  {/* Date */}
                  <td style={{ padding: '10px 8px', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatSpecDate(v.spec_date)}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button
                      onClick={(e) => handleActionsClick(e, v)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: '4px', borderRadius: '4px',
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateSpecModal
          products={products}
          customers={customers}
          marketConfigs={marketConfigs}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}

      {actionsMenu && (
        <ActionsMenu
          variant={actionsMenu.variant}
          position={actionsMenu.position}
          onClose={() => setActionsMenu(null)}
          onEdit={() => { handleEdit(actionsMenu.variant); setActionsMenu(null) }}
          onClone={() => { setCloneSource(actionsMenu.variant); setActionsMenu(null) }}
          onRevision={() => { setRevisionSource(actionsMenu.variant); setActionsMenu(null) }}
          onHistory={() => { setHistoryVariantId(actionsMenu.variant.variant_id); setActionsMenu(null) }}
          onDelete={() => { handleDelete(actionsMenu.variant); setActionsMenu(null) }}
        />
      )}

      {cloneSource && (
        <CloneSpecModal
          sourceVariant={cloneSource}
          products={products}
          customers={customers}
          marketConfigs={marketConfigs}
          onClose={() => setCloneSource(null)}
          onCloned={(newVariantId) => {
            setCloneSource(null)
            loadData()
            if (onEditSpec) onEditSpec(newVariantId)
          }}
        />
      )}

      {revisionSource && (
        <CreateRevisionModal
          variant={revisionSource}
          onClose={() => setRevisionSource(null)}
          onCreated={() => {
            setRevisionSource(null)
            loadData()
          }}
        />
      )}

      {historyVariantId && (
        <VersionHistoryModal
          variantId={historyVariantId}
          onClose={() => setHistoryVariantId(null)}
        />
      )}
    </div>
  )
}

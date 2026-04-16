'use client'
import { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import { Plus, Edit2, X, Search, Loader2, Power } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { showToast } from '../../Toast'
import type { SpecMarketConfig } from '@/types/specs'

// ============================================================================
// Form state
// ============================================================================

interface MarketFormState {
  market_code: string
  market_name: string
  plug_type: string
  plug_standard: string
  input_voltage_rated: string
  input_voltage_extended: string
  input_frequency: string
  certification_marks: string[]
  operation_environment: string
}

const EMPTY_FORM: MarketFormState = {
  market_code: '',
  market_name: '',
  plug_type: '',
  plug_standard: '',
  input_voltage_rated: '',
  input_voltage_extended: '',
  input_frequency: '',
  certification_marks: [],
  operation_environment: '',
}

function configToForm(c: SpecMarketConfig): MarketFormState {
  return {
    market_code: c.market_code || '',
    market_name: c.market_name || '',
    plug_type: c.plug_type || '',
    plug_standard: c.plug_standard || '',
    input_voltage_rated: c.input_voltage_rated || '',
    input_voltage_extended: c.input_voltage_extended || '',
    input_frequency: c.input_frequency || '',
    certification_marks: Array.isArray(c.certification_marks) ? c.certification_marks : [],
    operation_environment: c.operation_environment || '',
  }
}

function formToPayload(f: MarketFormState) {
  const strOrNull = (v: string) => (v.trim() ? v.trim() : null)
  return {
    market_code: f.market_code.trim().toUpperCase(),
    market_name: f.market_name.trim(),
    plug_type: strOrNull(f.plug_type),
    plug_standard: strOrNull(f.plug_standard),
    input_voltage_rated: strOrNull(f.input_voltage_rated),
    input_voltage_extended: strOrNull(f.input_voltage_extended),
    input_frequency: strOrNull(f.input_frequency),
    certification_marks: f.certification_marks.length > 0 ? f.certification_marks : null,
    operation_environment: strOrNull(f.operation_environment),
  }
}

// ============================================================================
// Certification Marks Tag Input
// ============================================================================

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
}

function CertificationMarksInput({ value, onChange }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim().toUpperCase()
    if (!trimmed) return
    if (value.includes(trimmed)) {
      setInput('')
      return
    }
    onChange([...value, trimmed])
    setInput('')
  }

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
      padding: '5px 8px', borderRadius: '6px',
      border: '1px solid var(--border)', background: 'var(--bg-primary)',
      minHeight: '32px',
    }}>
      {value.map((tag, idx) => (
        <span
          key={idx}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '2px 6px 2px 8px', borderRadius: '4px',
            background: 'rgba(79,143,247,0.15)', color: 'var(--accent)',
            fontSize: '11px', fontWeight: 500,
          }}
        >
          {tag}
          <button
            onClick={() => removeTag(idx)}
            style={{
              background: 'none', border: 'none', color: 'var(--accent)',
              cursor: 'pointer', padding: '0', display: 'flex', marginLeft: '2px',
            }}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={value.length === 0 ? 'Type a mark and press Enter (e.g. CE, BIS, CCC)' : ''}
        style={{
          flex: 1, minWidth: '120px', padding: '3px 4px', border: 'none',
          background: 'transparent', color: 'var(--text-primary)',
          fontSize: '12px', outline: 'none',
        }}
      />
    </div>
  )
}

// ============================================================================
// Form Modal
// ============================================================================

interface FormModalProps {
  config: SpecMarketConfig | null
  onClose: () => void
  onSaved: () => void
}

function MarketFormModal({ config, onClose, onSaved }: FormModalProps) {
  const [form, setForm] = useState<MarketFormState>(
    config ? configToForm(config) : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const isEdit = !!config

  const handleSave = async () => {
    if (!form.market_code.trim()) {
      showToast('Market Code is required', 'error')
      return
    }
    if (!form.market_name.trim()) {
      showToast('Market Name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const payload = formToPayload(form)

      if (isEdit) {
        const { error } = await supabase
          .from('spec_market_configs')
          .update(payload)
          .eq('config_id', config!.config_id)
        if (error) throw error
        showToast('Market Config updated', 'success')
      } else {
        const { error } = await supabase
          .from('spec_market_configs')
          .insert({ ...payload, is_active: true })
        if (error) throw error
        showToast('Market Config created', 'success')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      // Handle unique constraint violation on market_code
      if (err.code === '23505' || err.message?.includes('duplicate')) {
        showToast('Market Code already exists. Choose a different code.', 'error')
      } else {
        showToast(err.message || 'Failed to save market config', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof MarketFormState>(key: K, value: MarketFormState[K]) => {
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
        width: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
            {isEdit ? 'Edit Market Config' : 'New Market Config'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={sectionStyle}>Basic Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Market Code *</label>
              <input
                value={form.market_code}
                onChange={(e) => update('market_code', e.target.value.toUpperCase())}
                placeholder="e.g. IN"
                maxLength={10}
                style={{ ...inputStyle, textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Market Name *</label>
              <input
                value={form.market_name}
                onChange={(e) => update('market_name', e.target.value)}
                placeholder="e.g. India"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionStyle}>Plug Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Plug Type</label>
              <input
                value={form.plug_type}
                onChange={(e) => update('plug_type', e.target.value)}
                placeholder="e.g. IEC Type D"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Plug Standard</label>
              <input
                value={form.plug_standard}
                onChange={(e) => update('plug_standard', e.target.value)}
                placeholder="e.g. IS 1293"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionStyle}>Electrical Input</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Rated Input Voltage</label>
              <input
                value={form.input_voltage_rated}
                onChange={(e) => update('input_voltage_rated', e.target.value)}
                placeholder="e.g. 190-240Vac"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Extended Input Voltage</label>
              <input
                value={form.input_voltage_extended}
                onChange={(e) => update('input_voltage_extended', e.target.value)}
                placeholder="e.g. 190-264Vac"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Input Frequency</label>
              <input
                value={form.input_frequency}
                onChange={(e) => update('input_frequency', e.target.value)}
                placeholder="e.g. 50-60Hz"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionStyle}>Certifications & Environment</div>
          <div>
            <label style={labelStyle}>Certification Marks</label>
            <CertificationMarksInput
              value={form.certification_marks}
              onChange={(v) => update('certification_marks', v)}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={labelStyle}>Operation Environment</label>
            <input
              value={form.operation_environment}
              onChange={(e) => update('operation_environment', e.target.value)}
              placeholder="e.g. Indoor Use"
              style={inputStyle}
            />
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
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Market Config')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main MarketConfigManager Component
// ============================================================================

export default function MarketConfigManager() {
  const [configs, setConfigs] = useState<SpecMarketConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editConfig, setEditConfig] = useState<SpecMarketConfig | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('spec_market_configs')
        .select('*')
        .order('market_code', { ascending: true })
      if (error) throw error
      setConfigs(data || [])
    } catch (err: any) {
      showToast(err.message || 'Failed to load market configs', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleActive = async (config: SpecMarketConfig) => {
    const nextState = !config.is_active
    const msg = nextState
      ? `Activate "${config.market_name}" (${config.market_code})?`
      : `Deactivate "${config.market_name}" (${config.market_code})?\n\nIt will be hidden from the market dropdown when creating new specs. Existing specs using this market config are not affected.`
    if (!window.confirm(msg)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_market_configs')
        .update({ is_active: nextState })
        .eq('config_id', config.config_id)
      if (error) throw error
      showToast(`Market Config ${nextState ? 'activated' : 'deactivated'}`, 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error')
    }
  }

  const filtered = configs.filter(c => {
    if (!showInactive && !c.is_active) return false
    if (search) {
      const term = search.toLowerCase()
      return (
        c.market_code.toLowerCase().includes(term) ||
        c.market_name.toLowerCase().includes(term)
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
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Market Configs</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {filtered.length} market{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditConfig(null); setShowForm(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: '13px',
            fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> New Market Config
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
            placeholder="Search markets..."
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
            {search ? 'No market configs match your search.' : 'No market configs yet. Click "New Market Config" to create one.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <thead>
              <tr>
                {['Code', 'Name', 'Plug', 'Voltage', 'Certifications', 'Status', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
                    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                    ...(h === 'Code' ? { width: '70px' } : {}),
                    ...(h === 'Status' ? { width: '90px' } : {}),
                    ...(h === '' ? { width: '90px' } : {}),
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.config_id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: c.is_active ? 1 : 0.5,
                  }}
                >
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                      background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 600,
                    }}>
                      {c.market_code}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: 500 }}>{c.market_name}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>
                    {c.plug_type || '—'}
                    {c.plug_standard && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.plug_standard}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: '12px' }}>{c.input_voltage_rated || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {Array.isArray(c.certification_marks) && c.certification_marks.length > 0
                        ? c.certification_marks.map((m, i) => (
                            <span key={i} style={{
                              fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                              background: 'rgba(79,143,247,0.15)', color: 'var(--accent)', fontWeight: 500,
                            }}>{m}</span>
                          ))
                        : <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>—</span>}
                    </div>
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
                        onClick={() => { setEditConfig(c); setShowForm(true) }}
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
        <MarketFormModal
          config={editConfig}
          onClose={() => { setShowForm(false); setEditConfig(null) }}
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

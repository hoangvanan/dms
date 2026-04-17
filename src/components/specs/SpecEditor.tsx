'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ArrowLeft, Save, Loader2, Eye, FileDown, Download, CheckCircle, Send, RotateCcw, History, FilePlus } from 'lucide-react'
import { useAuth } from '../AuthProvider'
import { showToast } from '../Toast'
import { createClient } from '@/lib/supabase'
import {
  fetchSpecVariant,
  fetchBlocksOrdered,
  computeBlockNumbering,
  canEdit,
  canVerify,
  canRelease,
  canReject,
  canCreateRevision,
  getStatusColor,
  formatSpecDate,
} from '@/lib/spec-helpers'
import type {
  SpecVariantFull,
  SpecBlock,
  BlockType,
  BlockContent,
  NumberedBlock,
  SectionHeaderContent,
  SubsectionHeaderContent,
  KeyValueTableContent,
  DataTableContent,
  ImageContent,
  TextContent,
} from '@/types/specs'
import BlockContainer from './blocks/BlockContainer'
import AddBlockMenu from './blocks/AddBlockMenu'
import SectionHeaderEditor from './blocks/SectionHeader'
import SubsectionHeaderEditor from './blocks/SubsectionHeader'
import KeyValueTableEditor from './blocks/KeyValueTable'
import DataTableEditor from './blocks/DataTable'
import ImageBlockEditor from './blocks/ImageBlock'
import TextBlockEditor from './blocks/TextBlock'
import PageBreakEditor from './blocks/PageBreak'
import CoverPageEditor from './blocks/predefined/CoverPage'
import TestConditionsEditor from './blocks/predefined/TestConditions'
import ProtectiveFunctionsEditor from './blocks/predefined/ProtectiveFunctions'
import GeneralIndicesEditor from './blocks/predefined/GeneralIndices'
import WarningsEditor from './blocks/predefined/Warnings'
import CreateRevisionModal from './blocks/predefined/CreateRevisionModal'
import VersionHistoryModal from './blocks/predefined/VersionHistoryModal'

// ============================================================================
// Default content for new blocks
// ============================================================================

function getDefaultContent(blockType: BlockType): BlockContent {
  switch (blockType) {
    case 'section_header':
      return { title: 'New Section' } as SectionHeaderContent
    case 'subsection_header':
      return { title: 'New Subsection' } as SubsectionHeaderContent
    case 'key_value_table':
      return { rows: [{ label: '', value: '' }] } as KeyValueTableContent
    case 'data_table':
      return { columns: ['Column 1', 'Column 2'], rows: [['', '']] } as DataTableContent
    case 'image':
      return { asset_id: '', width_percent: 100, caption: '' } as ImageContent
    case 'text':
      return { html: '<p></p>' } as TextContent
    case 'page_break':
      return {} as BlockContent
    case 'predefined_cover':
      return {} as BlockContent
    case 'predefined_test_conditions':
      return {} as BlockContent
    case 'predefined_protective':
      return { items: [] } as BlockContent
    case 'predefined_general_indices':
      return { clauses: [] } as BlockContent
    case 'predefined_warnings':
      return { text: '' } as BlockContent
    default:
      return {} as BlockContent
  }
}

// ============================================================================
// Block editor router — routes each block_type to its editor component
// ============================================================================

function BlockEditor({ block, onUpdate, disabled, variant, onVariantFieldChange }: {
  block: SpecBlock; onUpdate: (content: any) => void; disabled: boolean; variant: SpecVariantFull | null;
  onVariantFieldChange?: (fields: { spec_date?: string; contacts_override?: any }) => void
}) {
  const content = block.content as any

  switch (block.block_type) {
    case 'section_header':
      return <SectionHeaderEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'subsection_header':
      return <SubsectionHeaderEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'key_value_table':
      return <KeyValueTableEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'data_table':
      return <DataTableEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'image':
      return <ImageBlockEditor content={content} onChange={onUpdate} disabled={disabled} variantId={variant?.variant_id} />
    case 'text':
      return <TextBlockEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'page_break':
      return <PageBreakEditor />
    case 'predefined_cover':
      return <CoverPageEditor variant={variant} disabled={disabled} onVariantFieldChange={onVariantFieldChange} />
    case 'predefined_test_conditions':
      return <TestConditionsEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'predefined_protective':
      return <ProtectiveFunctionsEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'predefined_general_indices':
      return <GeneralIndicesEditor content={content} onChange={onUpdate} disabled={disabled} />
    case 'predefined_warnings':
      return <WarningsEditor content={content} onChange={onUpdate} disabled={disabled} />
    default:
      return (
        <div style={{
          padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px',
          fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center',
        }}>
          Unknown block type: {block.block_type}
        </div>
      )
  }
}

// ============================================================================
// Main SpecEditor Component
// ============================================================================

interface SpecEditorProps {
  variantId: string
  onBack: () => void
}

export default function SpecEditor({ variantId, onBack }: SpecEditorProps) {
  const { profile } = useAuth()
  const [variant, setVariant] = useState<SpecVariantFull | null>(null)
  const [blocks, setBlocks] = useState<SpecBlock[]>([])
  const [numberedBlocks, setNumberedBlocks] = useState<NumberedBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [workflowAction, setWorkflowAction] = useState<'verify' | 'release' | 'reject' | null>(null)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Load variant + blocks
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const v = await fetchSpecVariant(variantId)
      if (!v) {
        showToast('Specification not found', 'error')
        onBack()
        return
      }
      setVariant(v)
      setBlocks(v.blocks)
      setNumberedBlocks(computeBlockNumbering(v.blocks))
    } catch (err) {
      console.error('Load error:', err)
      showToast('Failed to load specification', 'error')
    } finally {
      setLoading(false)
    }
  }, [variantId, onBack])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Recompute numbering when blocks change
  useEffect(() => {
    setNumberedBlocks(computeBlockNumbering(blocks))
  }, [blocks])

  const isLocked = variant ? !canEdit(variant).allowed : true

  // ---- Workflow permission checks ----
  const verifyCheck = variant && profile
    ? canVerify(profile.role, profile.id, variant)
    : { allowed: false, reason: '' }
  const releaseCheck = variant && profile
    ? canRelease(profile.role, profile.id, variant)
    : { allowed: false, reason: '' }
  const rejectCheck = variant && profile
    ? canReject(profile.role, profile.id, variant)
    : { allowed: false, reason: '' }

  // ---- Block operations ----

  const handleAddBlock = async (blockType: BlockType) => {
    if (isLocked) return

    const newBlock: Partial<SpecBlock> = {
      variant_id: variantId,
      block_type: blockType,
      sort_order: blocks.length,
      content: getDefaultContent(blockType),
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('spec_blocks')
        .insert(newBlock)
        .select()
        .single()

      if (error) throw error

      setBlocks(prev => [...prev, data as SpecBlock])
      setHasChanges(true)
      showToast('Block added', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to add block', 'error')
    }
  }

  const handleUpdateBlock = async (blockId: string, content: any) => {
    if (isLocked) return

    // Only mark as changed if content actually differs from what's in state.
    // This prevents spurious "dirty" state when block editors (e.g. tiptap)
    // normalize their content on mount and emit an onChange that is
    // semantically equivalent to the loaded value.
    setBlocks(prev => {
      const target = prev.find(b => b.block_id === blockId)
      if (target) {
        const currentJson = JSON.stringify(target.content)
        const nextJson = JSON.stringify(content)
        if (currentJson !== nextJson) {
          setHasChanges(true)
        }
      }
      return prev.map(b => b.block_id === blockId ? { ...b, content } : b)
    })
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (isLocked) return

    const confirm = window.confirm('Delete this block?')
    if (!confirm) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_blocks')
        .delete()
        .eq('block_id', blockId)

      if (error) throw error

      setBlocks(prev => prev.filter(b => b.block_id !== blockId))
      setHasChanges(true)
      showToast('Block deleted', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete block', 'error')
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.block_id === active.id)
      const newIndex = prev.findIndex(b => b.block_id === over.id)

      // Don't allow moving the cover page (always first)
      if (prev[oldIndex]?.block_type === 'predefined_cover') return prev
      if (newIndex === 0 && prev[0]?.block_type === 'predefined_cover') return prev

      return arrayMove(prev, oldIndex, newIndex)
    })
    setHasChanges(true)
  }

  // Handle cover page editable fields (date, contacts) — queue for save
  const handleVariantFieldChange = (fields: { spec_date?: string; contacts_override?: any; customer_part_no?: string | null }) => {
    if (isLocked || !variant) return

    setVariant(prev => {
      if (!prev) return prev
      const updated = { ...prev }
      if (fields.spec_date !== undefined) updated.spec_date = fields.spec_date || null
      if (fields.contacts_override !== undefined) updated.contacts_override = fields.contacts_override
      if (fields.customer_part_no !== undefined) updated.customer_part_no = fields.customer_part_no
      return updated
    })
    setHasChanges(true)
  }

  // Save all block changes (content + order)
  const handleSave = async () => {
    if (!variant || isLocked) return
    setSaving(true)

    try {
      const supabase = createClient()

      // Batch update all blocks with new sort_order and content
      const updates = blocks.map((block, index) => ({
        block_id: block.block_id,
        variant_id: block.variant_id,
        block_type: block.block_type,
        sort_order: index,
        content: block.content,
      }))

      // Upsert all blocks
      const { error } = await supabase
        .from('spec_blocks')
        .upsert(updates, { onConflict: 'block_id' })

      if (error) throw error

      // Update variant's updated_by + any cover page editable fields
      await supabase
        .from('spec_variants')
        .update({
          updated_by: profile?.id,
          spec_date: variant?.spec_date,
          contacts_override: variant?.contacts_override,
          customer_part_no: variant?.customer_part_no,
        })
        .eq('variant_id', variantId)

      setHasChanges(false)
      showToast('Saved successfully', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ---- PDF operations ----

  const handlePreviewPdf = () => {
    // Opens HTML preview in a new tab (server renders the assembled HTML)
    window.open(`/api/specs/${variantId}/generate`, '_blank')
  }

  const handleGeneratePdf = async () => {
    if (hasChanges) {
      showToast('Please save your changes before generating PDF', 'error')
      return
    }

    setGeneratingPdf(true)
    showToast('Generating PDF... This may take a moment.', 'info')

    try {
      const response = await fetch(`/api/specs/${variantId}/generate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      // Check if server-side upload succeeded
      const uploadStatus = response.headers.get('X-PDF-Upload-Status')

      // Download the PDF
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${variant?.type_designation?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'spec'}_spec.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (uploadStatus === 'failed') {
        showToast('PDF downloaded, but failed to save to server. Download button won\'t work until next successful generation.', 'error')
      } else {
        showToast('PDF generated and downloaded', 'success')
      }

      // Reload variant to get updated current_pdf_path
      const v = await fetchSpecVariant(variantId)
      if (v) setVariant(v)
    } catch (err: any) {
      console.error('PDF generation error:', err)
      showToast(err.message || 'PDF generation failed', 'error')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!variant?.current_pdf_path) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('spec-assets')
        .createSignedUrl(variant.current_pdf_path, 300)

      if (error || !data?.signedUrl) throw new Error('Failed to get download URL')

      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = `${variant.type_designation?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'spec'}_spec.pdf`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: any) {
      showToast(err.message || 'Failed to download PDF', 'error')
    }
  }

  // ---- Workflow actions ----

  const handleVerify = async () => {
    if (!variant || !profile || !verifyCheck.allowed) return
    if (hasChanges) {
      showToast('Please save your changes before verifying', 'error')
      return
    }

    const ok = window.confirm(
      `Verify this specification?\n\nStatus will change from "Processing" to "Verification".\n` +
      `A different editor will need to release it (4-eyes rule).`
    )
    if (!ok) return

    setWorkflowAction('verify')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_variants')
        .update({
          status: 'verification',
          verified_by: profile.id,
          verified_at: new Date().toISOString(),
          updated_by: profile.id,
        })
        .eq('variant_id', variantId)

      if (error) throw error

      showToast('Specification verified', 'success')
      await loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to verify', 'error')
    } finally {
      setWorkflowAction(null)
    }
  }

  const handleRelease = async () => {
    if (!variant || !profile || !releaseCheck.allowed) return

    const ok = window.confirm(
      `Release this specification?\n\nStatus will change from "Verification" to "Released".\n` +
      `Once released, the specification cannot be edited. To make changes, a new revision must be created.`
    )
    if (!ok) return

    setWorkflowAction('release')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_variants')
        .update({
          status: 'released',
          released_by: profile.id,
          released_at: new Date().toISOString(),
          updated_by: profile.id,
        })
        .eq('variant_id', variantId)

      if (error) throw error

      showToast('Specification released', 'success')
      await loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to release', 'error')
    } finally {
      setWorkflowAction(null)
    }
  }

  const handleReject = async () => {
    if (!variant || !profile || !rejectCheck.allowed) return

    const ok = window.confirm(
      `Reject this specification?\n\nStatus will return from "Verification" to "Processing".\n` +
      `Verification will be cleared — the spec can be edited and re-verified.`
    )
    if (!ok) return

    setWorkflowAction('reject')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('spec_variants')
        .update({
          status: 'processing',
          verified_by: null,
          verified_at: null,
          updated_by: profile.id,
        })
        .eq('variant_id', variantId)

      if (error) throw error

      showToast('Specification rejected and sent back to Processing', 'success')
      await loadData()
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'error')
    } finally {
      setWorkflowAction(null)
    }
  }

  // ---- Render helpers ----

  const renderWorkflowButtons = () => {
    if (!variant) return null

    const btnBase = {
      display: 'flex' as const,
      alignItems: 'center' as const,
      gap: '6px',
      padding: '7px 12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '12px',
      fontWeight: 500,
    }

    // Processing → Verify button
    if (variant.status === 'processing') {
      const enabled = verifyCheck.allowed && !workflowAction && !hasChanges
      return (
        <button
          onClick={handleVerify}
          disabled={!enabled}
          title={!verifyCheck.allowed ? verifyCheck.reason : (hasChanges ? 'Save changes first' : '')}
          style={{
            ...btnBase,
            background: enabled ? '#3b82f6' : 'var(--bg-tertiary)',
            color: enabled ? '#fff' : 'var(--text-secondary)',
            cursor: enabled ? 'pointer' : 'not-allowed',
          }}
        >
          {workflowAction === 'verify'
            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            : <CheckCircle size={13} />}
          Verify
        </button>
      )
    }

    // Verification → Release + Reject
    if (variant.status === 'verification') {
      return (
        <>
          <button
            onClick={handleReject}
            disabled={!rejectCheck.allowed || !!workflowAction}
            title={!rejectCheck.allowed ? rejectCheck.reason : ''}
            style={{
              ...btnBase,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: rejectCheck.allowed ? '#ef4444' : 'var(--text-secondary)',
              cursor: rejectCheck.allowed && !workflowAction ? 'pointer' : 'not-allowed',
            }}
          >
            {workflowAction === 'reject'
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <RotateCcw size={13} />}
            Reject
          </button>
          <button
            onClick={handleRelease}
            disabled={!releaseCheck.allowed || !!workflowAction}
            title={!releaseCheck.allowed ? releaseCheck.reason : ''}
            style={{
              ...btnBase,
              background: releaseCheck.allowed ? '#10b981' : 'var(--bg-tertiary)',
              color: releaseCheck.allowed ? '#fff' : 'var(--text-secondary)',
              cursor: releaseCheck.allowed && !workflowAction ? 'pointer' : 'not-allowed',
            }}
          >
            {workflowAction === 'release'
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={13} />}
            Release
          </button>
        </>
      )
    }

    // Released → Create Revision + History
    if (variant.status === 'released') {
      return (
        <>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              ...btnBase,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <History size={13} />
            History
          </button>
          <button
            onClick={() => setShowRevisionModal(true)}
            style={{
              ...btnBase,
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <FilePlus size={13} />
            Create Revision
          </button>
        </>
      )
    }

    return null
  }

  const renderStatusInfo = () => {
    if (!variant) return null

    // Sub-line under the variant title showing who verified/released
    const parts: string[] = []

    if (variant.verified_by_profile && variant.verified_at) {
      const date = formatSpecDate(variant.verified_at)
      parts.push(`Verified by ${variant.verified_by_profile.full_name || variant.verified_by_profile.email}${date ? ` on ${date}` : ''}`)
    }

    if (variant.released_by_profile && variant.released_at) {
      const date = formatSpecDate(variant.released_at)
      parts.push(`Released by ${variant.released_by_profile.full_name || variant.released_by_profile.email}${date ? ` on ${date}` : ''}`)
    }

    if (parts.length === 0) return null

    return (
      <div style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        marginTop: '4px',
        fontStyle: 'italic',
      }}>
        {parts.join(' · ')}
      </div>
    )
  }

  // ---- Render ----

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} color="var(--text-secondary)" />
      </div>
    )
  }

  if (!variant) return null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', display: 'flex',
          }}
          title="Back to list"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Variant info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>
            {variant.type_designation}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
            <span>{variant.umevs_part_no}</span>
            {variant.spec_customers && <span>{variant.spec_customers.name}</span>}
            {variant.spec_market_configs && <span>{variant.spec_market_configs.market_code}</span>}
            {variant.spec_date && <span>{formatSpecDate(variant.spec_date)}</span>}
          </div>
        </div>

        {/* Status + verify/release info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '12px',
            background: `${getStatusColor(variant.status)}20`,
            color: getStatusColor(variant.status),
            textTransform: 'capitalize',
          }}>
            {variant.status}
          </span>
          {renderStatusInfo()}
        </div>

        {/* History button (always visible) */}
        {variant.status !== 'released' && (
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer',
            }}
            title="Version History"
          >
            <History size={13} />
          </button>
        )}

        {/* Workflow buttons */}
        {renderWorkflowButtons()}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving || isLocked}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '6px', border: 'none',
            background: hasChanges && !isLocked ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: hasChanges && !isLocked ? '#fff' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: 500,
            cursor: hasChanges && !isLocked ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Editor Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: '80px' }}>
        {isLocked && (
          <div style={{
            padding: '10px 14px', marginBottom: '12px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '12px', color: '#ef4444',
          }}>
            This specification is released and cannot be edited. Create a new revision to make changes.
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map(b => b.block_id)}
            strategy={verticalListSortingStrategy}
          >
            {numberedBlocks.map((block) => (
              <BlockContainer
                key={block.block_id}
                block={block}
                number={block.number}
                isLocked={isLocked}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
              >
                <BlockEditor
                  block={block}
                  onUpdate={(content) => handleUpdateBlock(block.block_id, content)}
                  disabled={isLocked}
                  variant={variant}
                  onVariantFieldChange={handleVariantFieldChange}
                />
              </BlockContainer>
            ))}
          </SortableContext>
        </DndContext>

        {/* Add Block */}
        {!isLocked && (
          <div style={{ marginTop: '8px', marginBottom: '40px' }}>
            <AddBlockMenu onAdd={handleAddBlock} disabled={isLocked} />
          </div>
        )}

        {blocks.length === 0 && !isLocked && (
          <div style={{
            textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px',
          }}>
            No blocks yet. Click &ldquo;Add Block&rdquo; to start building your specification.
          </div>
        )}
      </div>

      {/* Bottom Bar — PDF actions */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '10px',
        flexShrink: 0,
      }}>
        {/* Current PDF indicator */}
        {variant.current_pdf_path && (
          <span style={{
            fontSize: '11px', color: 'var(--text-secondary)', marginRight: 'auto',
          }}>
            PDF available
          </span>
        )}

        {/* Preview HTML */}
        <button
          onClick={handlePreviewPdf}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '6px',
            border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Eye size={14} />
          Preview
        </button>

        {/* Download PDF — only when PDF exists */}
        {variant.current_pdf_path && (
          <button
            onClick={handleDownloadPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Download PDF
          </button>
        )}

        {/* Generate PDF */}
        <button
          onClick={handleGeneratePdf}
          disabled={generatingPdf || hasChanges}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '6px', border: 'none',
            background: generatingPdf || hasChanges ? 'var(--bg-tertiary)' : '#10b981',
            color: generatingPdf || hasChanges ? 'var(--text-secondary)' : '#fff',
            fontSize: '12px', fontWeight: 500,
            cursor: generatingPdf || hasChanges ? 'not-allowed' : 'pointer',
          }}
          title={hasChanges ? 'Save changes before generating PDF' : ''}
        >
          {generatingPdf ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <FileDown size={14} />
          )}
          {generatingPdf ? 'Generating...' : 'Generate PDF'}
        </button>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Modals */}
      {showRevisionModal && variant && (
        <CreateRevisionModal
          variant={variant}
          onClose={() => setShowRevisionModal(false)}
          onCreated={() => loadData()}
        />
      )}

      {showHistoryModal && variant && (
        <VersionHistoryModal
          variantId={variantId}
          specStatus={variant.status}
          onClose={() => setShowHistoryModal(false)}
          onRevisionUpdated={() => loadData()}
        />
      )}
    </div>
  )
}

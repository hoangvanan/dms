// ============================================================================
// Spec Generator — Helper Functions
// File: src/lib/spec-helpers.ts
// ============================================================================

import { createClient } from './supabase'
import type { Profile, UserRole } from '@/types'
import type {
  SpecVariant,
  SpecVariantFull,
  SpecBlock,
  SpecProduct,
  SpecCustomer,
  SpecMarketConfig,
  SpecAsset,
  SpecVersion,
  SpecStatus,
  SpecContacts,
  BlockType,
  ResolvedField,
  NumberedBlock,
  InheritanceSource,
} from '@/types/specs'

// ============================================================================
// 1. DATA FETCHING
// ============================================================================

/**
 * Fetch a single spec variant with all joined relations.
 * Returns null if not found.
 */
export async function fetchSpecVariant(variantId: string): Promise<SpecVariantFull | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('spec_variants')
    .select(`
      *,
      spec_products (*),
      spec_customers (*),
      spec_market_configs (*),
      created_by_profile:profiles!spec_variants_created_by_fkey (id, full_name, email, role),
      verified_by_profile:profiles!spec_variants_verified_by_fkey (id, full_name, email, role),
      released_by_profile:profiles!spec_variants_released_by_fkey (id, full_name, email, role)
    `)
    .eq('variant_id', variantId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  // Fetch blocks separately (cleaner than nested select)
  const blocks = await fetchBlocksOrdered(variantId)

  return { ...data, blocks } as SpecVariantFull
}

/**
 * Fetch all spec variants with joined relations for list view.
 * Supports search, customer filter, and status filter.
 */
export async function fetchSpecVariants(options?: {
  search?: string
  customerId?: string
  status?: SpecStatus
}): Promise<SpecVariant[]> {
  const supabase = createClient()

  let query = supabase
    .from('spec_variants')
    .select(`
      *,
      spec_products (product_id, product_family),
      spec_customers (customer_id, name, brand_name),
      spec_market_configs (config_id, market_code, market_name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (options?.customerId) {
    query = query.eq('customer_id', options.customerId)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.search) {
    const term = `%${options.search}%`
    query = query.or(
      `type_designation.ilike.${term},umevs_part_no.ilike.${term},customer_part_no.ilike.${term}`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('fetchSpecVariants error:', error)
    return []
  }

  return (data ?? []) as SpecVariant[]
}

/**
 * Fetch blocks for a variant, ordered by sort_order.
 */
export async function fetchBlocksOrdered(variantId: string): Promise<SpecBlock[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('spec_blocks')
    .select('*')
    .eq('variant_id', variantId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('fetchBlocksOrdered error:', error)
    return []
  }

  return (data ?? []) as SpecBlock[]
}

/**
 * Fetch all active products.
 */
export async function fetchProducts(): Promise<SpecProduct[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('spec_products')
    .select('*')
    .eq('is_active', true)
    .order('product_family')
  return (data ?? []) as SpecProduct[]
}

/**
 * Fetch all active customers.
 */
export async function fetchCustomers(): Promise<SpecCustomer[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('spec_customers')
    .select('*')
    .eq('is_active', true)
    .order('name')
  return (data ?? []) as SpecCustomer[]
}

/**
 * Fetch all active market configs.
 */
export async function fetchMarketConfigs(): Promise<SpecMarketConfig[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('spec_market_configs')
    .select('*')
    .eq('is_active', true)
    .order('market_code')
  return (data ?? []) as SpecMarketConfig[]
}

/**
 * Fetch assets for a variant (+ shared assets).
 */
export async function fetchAssets(variantId?: string): Promise<SpecAsset[]> {
  const supabase = createClient()

  let query = supabase.from('spec_assets').select('*')

  if (variantId) {
    query = query.or(`variant_id.eq.${variantId},is_shared.eq.true`)
  } else {
    query = query.eq('is_shared', true)
  }

  const { data } = await query.order('created_at', { ascending: false })
  return (data ?? []) as SpecAsset[]
}

/**
 * Fetch version history for a variant.
 */
export async function fetchVersions(variantId: string): Promise<SpecVersion[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('spec_versions')
    .select(`
      *,
      created_by_profile:profiles!spec_versions_created_by_fkey (id, full_name, email)
    `)
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false })

  return (data ?? []) as SpecVersion[]
}

// ============================================================================
// 2. DATA INHERITANCE
// ============================================================================

/**
 * Fields that participate in the inheritance chain.
 * Maps field name → which table column to check.
 */
const INHERITABLE_FIELDS: Record<string, { marketField?: string; productField?: string }> = {
  input_voltage_rated:    { marketField: 'input_voltage_rated',    productField: 'default_input_voltage' },
  input_voltage_extended: { marketField: 'input_voltage_extended', productField: undefined },
  input_frequency:        { marketField: 'input_frequency',        productField: 'default_input_frequency' },
  operation_environment:  { marketField: 'operation_environment',  productField: undefined },
  plug_type:              { marketField: 'plug_type',              productField: undefined },
  plug_standard:          { marketField: 'plug_standard',          productField: undefined },
  certification_marks:    { marketField: 'certification_marks',    productField: undefined },
  ip_rating:              { marketField: undefined,                productField: 'ip_rating' },
  protection_class:       { marketField: undefined,                productField: 'protection_class' },
  housing_material:       { marketField: undefined,                productField: 'housing_material' },
  weight_grams:           { marketField: undefined,                productField: 'weight_grams' },
  weight_tolerance:       { marketField: undefined,                productField: 'weight_tolerance' },
  efficiency:             { marketField: undefined,                productField: 'default_efficiency' },
  power_factor:           { marketField: undefined,                productField: 'default_power_factor' },
}

/**
 * Resolve a single field value through the inheritance chain:
 *   1. variant.override_data[field] → if not null, use it (source: 'override')
 *   2. marketConfig[marketField]    → if not null, use it (source: 'market')
 *   3. product[productField]        → fallback (source: 'product')
 *
 * Returns { value, source } so UI can display the colored indicator.
 */
export function resolveField(
  field: string,
  overrideData: Record<string, string | null> | null,
  marketConfig: SpecMarketConfig | null,
  product: SpecProduct | null
): ResolvedField {
  // Step 1: Override
  const overrideValue = overrideData?.[field]
  if (overrideValue != null && overrideValue !== '') {
    return { value: overrideValue, source: 'override' }
  }

  // Step 2: Market config
  const mapping = INHERITABLE_FIELDS[field]
  if (mapping?.marketField && marketConfig) {
    const marketValue = (marketConfig as Record<string, any>)[mapping.marketField]
    if (marketValue != null && marketValue !== '') {
      return { value: String(marketValue), source: 'market' }
    }
  }

  // Step 3: Product fallback
  if (mapping?.productField && product) {
    const productValue = (product as Record<string, any>)[mapping.productField]
    if (productValue != null && productValue !== '') {
      return { value: String(productValue), source: 'product' }
    }
  }

  return { value: null, source: null }
}

/**
 * Resolve all inheritable fields at once.
 * Returns a map of field → { value, source }.
 */
export function resolveAllFields(
  overrideData: Record<string, string | null> | null,
  marketConfig: SpecMarketConfig | null,
  product: SpecProduct | null
): Record<string, ResolvedField> {
  const result: Record<string, ResolvedField> = {}
  for (const field of Object.keys(INHERITABLE_FIELDS)) {
    result[field] = resolveField(field, overrideData, marketConfig, product)
  }
  return result
}

/**
 * Resolve contacts: contacts_override on variant → customer.default_contacts.
 */
export function resolveContacts(
  variant: SpecVariant,
  customer: SpecCustomer | null
): SpecContacts {
  if (variant.contacts_override) {
    return variant.contacts_override
  }
  return customer?.default_contacts ?? {}
}

// ============================================================================
// 3. BLOCK NUMBERING
// ============================================================================

/**
 * Compute auto-numbering for an ordered list of blocks.
 *
 * Rules:
 * - section_header: increments main counter (1, 2, 3...)
 * - subsection_header: increments sub counter under current section (3.1, 3.2...)
 * - predefined blocks that act as sections (test_conditions, protective, general_indices, warnings):
 *   treated as section_header for numbering purposes
 * - All other block types: no number (empty string)
 */
export function computeBlockNumbering(blocks: SpecBlock[]): NumberedBlock[] {
  let sectionCount = 0
  let subsectionCount = 0

  const SECTION_LEVEL_TYPES: BlockType[] = [
    'section_header',
    'predefined_test_conditions',
    'predefined_protective',
    'predefined_general_indices',
    'predefined_warnings',
  ]

  return blocks.map((block) => {
    let number = ''

    if (SECTION_LEVEL_TYPES.includes(block.block_type)) {
      sectionCount++
      subsectionCount = 0
      number = String(sectionCount)
    } else if (block.block_type === 'subsection_header') {
      subsectionCount++
      number = `${sectionCount}.${subsectionCount}`
    }
    // All other types: number stays ''

    return { ...block, number }
  })
}

// ============================================================================
// 4. STATUS WORKFLOW & 4-EYES RULE
// ============================================================================

/**
 * Check if user can verify a spec.
 * Rules:
 * - Spec must be in 'processing' status
 * - User must be editor or admin
 */
export function canVerify(
  userRole: UserRole,
  userId: string,
  variant: SpecVariant
): { allowed: boolean; reason?: string } {
  if (variant.status !== 'processing') {
    return { allowed: false, reason: 'Only specs in "processing" status can be verified' }
  }

  if (userRole !== 'admin' && userRole !== 'editor') {
    return { allowed: false, reason: 'Only editors and admins can verify specs' }
  }

  return { allowed: true }
}

/**
 * Check if user can release a spec.
 * Rules:
 * - Spec must be in 'verification' status
 * - User must be editor or admin
 * - 4-eyes: if user is editor, they cannot release a spec they verified
 * - Admin bypasses 4-eyes rule
 */
export function canRelease(
  userRole: UserRole,
  userId: string,
  variant: SpecVariant
): { allowed: boolean; reason?: string } {
  if (variant.status !== 'verification') {
    return { allowed: false, reason: 'Only specs in "verification" status can be released' }
  }

  if (userRole !== 'admin' && userRole !== 'editor') {
    return { allowed: false, reason: 'Only editors and admins can release specs' }
  }

  // 4-eyes rule: editor who verified cannot release
  if (userRole === 'editor' && variant.verified_by === userId) {
    return { allowed: false, reason: '4-eyes rule: a different editor must release this spec' }
  }

  // Admin bypasses 4-eyes
  return { allowed: true }
}

/**
 * Check if user can reject a spec (send back from 'verification' to 'processing').
 * Rules:
 * - Spec must be in 'verification' status
 * - User must be editor or admin
 * - 4-eyes: if user is editor, they cannot reject a spec they verified
 * - Admin bypasses 4-eyes rule
 */
export function canReject(
  userRole: UserRole,
  userId: string,
  variant: SpecVariant
): { allowed: boolean; reason?: string } {
  if (variant.status !== 'verification') {
    return { allowed: false, reason: 'Only specs in "verification" status can be rejected' }
  }

  if (userRole !== 'admin' && userRole !== 'editor') {
    return { allowed: false, reason: 'Only editors and admins can reject specs' }
  }

  // 4-eyes rule: editor who verified cannot reject their own verification
  if (userRole === 'editor' && variant.verified_by === userId) {
    return { allowed: false, reason: '4-eyes rule: a different editor must reject this spec' }
  }

  // Admin bypasses 4-eyes
  return { allowed: true }
}

/**
 * Check if a spec can be edited (blocks/metadata).
 * Released specs are locked — must create a new revision.
 */
export function canEdit(variant: SpecVariant): { allowed: boolean; reason?: string } {
  if (variant.status === 'released') {
    return { allowed: false, reason: 'Released specs cannot be edited. Create a new revision.' }
  }
  return { allowed: true }
}

/**
 * Check if a new revision can be created from this spec.
 * Only released specs can have new revisions.
 */
export function canCreateRevision(variant: SpecVariant): { allowed: boolean; reason?: string } {
  if (variant.status !== 'released') {
    return { allowed: false, reason: 'Only released specs can have new revisions' }
  }
  return { allowed: true }
}

/**
 * Get the next index/revision letter.
 * null → "A", "A" → "B", "B" → "C", ...
 */
export function getNextRevision(current: string | null): string {
  if (!current) return 'A'
  const code = current.charCodeAt(0)
  return String.fromCharCode(code + 1)
}

// ============================================================================
// 5. CLONE
// ============================================================================

/**
 * Clone a spec variant: copy variant metadata + all blocks.
 * Assets are shared by reference (Option A — no file duplication).
 *
 * @returns The new variant_id, or throws on error.
 */
export async function cloneVariant(
  sourceVariantId: string,
  overrides: {
    product_id: string
    customer_id: string
    config_id: string
    umevs_part_no: string
    customer_part_no: string | null
    type_designation: string
    spec_date: string
  },
  userId: string
): Promise<string> {
  const supabase = createClient()

  // 1. Fetch source variant
  const { data: source, error: srcErr } = await supabase
    .from('spec_variants')
    .select('contacts_override, override_data')
    .eq('variant_id', sourceVariantId)
    .is('deleted_at', null)
    .single()

  if (srcErr || !source) {
    throw new Error('Source specification not found')
  }

  // 2. Create new variant
  const { data: newVariant, error: insertErr } = await supabase
    .from('spec_variants')
    .insert({
      product_id: overrides.product_id,
      customer_id: overrides.customer_id,
      config_id: overrides.config_id,
      umevs_part_no: overrides.umevs_part_no,
      customer_part_no: overrides.customer_part_no,
      type_designation: overrides.type_designation,
      spec_date: overrides.spec_date,
      status: 'processing',
      current_index_rev: null,
      contacts_override: source.contacts_override,
      override_data: source.override_data ?? {},
      cloned_from: sourceVariantId,
      created_by: userId,
      updated_by: userId,
    })
    .select('variant_id')
    .single()

  if (insertErr || !newVariant) {
    throw new Error(insertErr?.message || 'Failed to create cloned specification')
  }

  // 3. Clone all blocks (preserve sort_order + content, new UUIDs auto-generated)
  const blocks = await fetchBlocksOrdered(sourceVariantId)

  if (blocks.length > 0) {
    const clonedBlocks = blocks.map((b) => ({
      variant_id: newVariant.variant_id,
      block_type: b.block_type,
      sort_order: b.sort_order,
      content: b.content,
    }))

    const { error: blocksErr } = await supabase
      .from('spec_blocks')
      .insert(clonedBlocks)

    if (blocksErr) {
      // Rollback: soft-delete the new variant
      await supabase
        .from('spec_variants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('variant_id', newVariant.variant_id)
      throw new Error('Failed to clone blocks: ' + blocksErr.message)
    }
  }

  return newVariant.variant_id
}

/**
 * Create a new revision from a released spec.
 *
 * Steps:
 * 1. Snapshot current state into spec_versions
 * 2. Update variant: increment revision, reset status to processing, clear verify/release
 *
 * @param variantId - The released spec to create revision from
 * @param newRevision - The revision letter (e.g. "A", "B") — user-editable
 * @param changeDescription - Required description of what changed
 * @param userId - Who is creating the revision
 */
export async function createRevision(
  variantId: string,
  newRevision: string,
  changeDescription: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  // 1. Fetch current variant
  const { data: variant, error: varErr } = await supabase
    .from('spec_variants')
    .select('*')
    .eq('variant_id', variantId)
    .is('deleted_at', null)
    .single()

  if (varErr || !variant) {
    throw new Error('Specification not found')
  }

  if (variant.status !== 'released') {
    throw new Error('Only released specifications can have new revisions')
  }

  // 2. Fetch current blocks for snapshot
  const blocks = await fetchBlocksOrdered(variantId)

  // 3. Create snapshot in spec_versions
  const { error: snapErr } = await supabase
    .from('spec_versions')
    .insert({
      variant_id: variantId,
      index_rev: newRevision,
      blocks_snapshot: blocks.map(b => ({ block_type: b.block_type, sort_order: b.sort_order, content: b.content })),
      metadata_snapshot: {
        umevs_part_no: variant.umevs_part_no,
        customer_part_no: variant.customer_part_no,
        type_designation: variant.type_designation,
        spec_date: variant.spec_date,
        product_id: variant.product_id,
        customer_id: variant.customer_id,
        config_id: variant.config_id,
        contacts_override: variant.contacts_override,
        override_data: variant.override_data,
      },
      change_description: changeDescription,
      generated_pdf_path: variant.current_pdf_path,
      created_by: userId,
    })

  if (snapErr) {
    throw new Error('Failed to create version snapshot: ' + snapErr.message)
  }

  // 4. Update variant: new revision, reset status
  const { error: updateErr } = await supabase
    .from('spec_variants')
    .update({
      current_index_rev: newRevision,
      status: 'processing',
      verified_by: null,
      verified_at: null,
      released_by: null,
      released_at: null,
      updated_by: userId,
    })
    .eq('variant_id', variantId)

  if (updateErr) {
    throw new Error('Failed to update specification: ' + updateErr.message)
  }
}

// ============================================================================
// 6. UTILITY
// ============================================================================

/**
 * Update the change_description of a version entry.
 */
export async function updateVersionDescription(
  versionId: string,
  description: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('spec_versions')
    .update({ change_description: description })
    .eq('version_id', versionId)

  if (error) throw new Error('Failed to update description: ' + error.message)
}

/**
 * Format a date string for display (DD.MM.YYYY — European format used in specs).
 */
export function formatSpecDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

/**
 * Get watermark text based on spec status.
 * Released specs have no watermark.
 */
export function getWatermarkText(status: SpecStatus): string | null {
  if (status === 'released') return null
  return 'PRELIMINARY'
}

/**
 * Get status badge color for UI display.
 */
export function getStatusColor(status: SpecStatus): string {
  switch (status) {
    case 'processing':    return '#f59e0b'  // amber
    case 'verification':  return '#3b82f6'  // blue
    case 'released':      return '#10b981'  // green
    default:              return '#6b7280'  // gray
  }
}

/**
 * Get inheritance source indicator for UI.
 */
export function getSourceIndicator(source: InheritanceSource | null): {
  label: string
  color: string
} {
  switch (source) {
    case 'product':  return { label: 'From Product', color: '#3b82f6' }  // 🔵
    case 'market':   return { label: 'From Market',  color: '#10b981' }  // 🟢
    case 'override': return { label: 'Override',      color: '#f59e0b' }  // 🟡
    default:         return { label: 'Not set',       color: '#6b7280' }  // gray
  }
}

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
// 5. UTILITY
// ============================================================================

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

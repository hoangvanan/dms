// ============================================================================
// Spec Generator — TypeScript Types
// File: src/types/specs.ts
// ============================================================================

import type { Profile, UserRole } from './index'

// ----------------------------------------------------------------------------
// Enums / Union Types
// ----------------------------------------------------------------------------

export type SpecStatus = 'processing' | 'verification' | 'released'

export type BlockType =
  | 'section_header'
  | 'subsection_header'
  | 'key_value_table'
  | 'data_table'
  | 'image'
  | 'text'
  | 'page_break'
  | 'predefined_cover'
  | 'predefined_test_conditions'
  | 'predefined_protective'
  | 'predefined_general_indices'
  | 'predefined_warnings'

/** Where an inherited field value comes from */
export type InheritanceSource = 'product' | 'market' | 'override'

// ----------------------------------------------------------------------------
// Database Tables
// ----------------------------------------------------------------------------

export interface SpecProduct {
  product_id: string
  product_family: string
  cell_config: string | null
  nominal_cell_voltage: number | null
  max_charge_current: number | null
  max_output_power: number | null
  housing_material: string | null
  ip_rating: string | null
  protection_class: string | null
  weight_grams: number | null
  weight_tolerance: number | null
  default_input_voltage: string | null
  default_input_frequency: string | null
  default_efficiency: string | null
  default_power_factor: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SpecCustomer {
  customer_id: string
  name: string
  brand_name: string | null
  default_contacts: SpecContacts | null
  is_active: boolean
  created_at: string
}

export interface SpecMarketConfig {
  config_id: string
  market_code: string
  market_name: string
  plug_type: string | null
  plug_standard: string | null
  input_voltage_rated: string | null
  input_voltage_extended: string | null
  input_frequency: string | null
  certification_marks: string[] | null
  operation_environment: string | null
  is_active: boolean
  created_at: string
}

export interface SpecVariant {
  variant_id: string
  product_id: string | null
  customer_id: string | null
  config_id: string | null
  umevs_part_no: string
  customer_part_no: string | null
  type_designation: string
  spec_date: string | null
  status: SpecStatus
  current_index_rev: string | null
  verified_by: string | null
  verified_at: string | null
  released_by: string | null
  released_at: string | null
  contacts_override: SpecContacts | null
  override_data: Record<string, string | null>
  current_pdf_path: string | null
  cloned_from: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Joined relations
  spec_products?: SpecProduct
  spec_customers?: SpecCustomer
  spec_market_configs?: SpecMarketConfig
  created_by_profile?: Profile
  updated_by_profile?: Profile
  verified_by_profile?: Profile
  released_by_profile?: Profile
}

export interface SpecBlock {
  block_id: string
  variant_id: string
  block_type: BlockType
  sort_order: number
  content: BlockContent
  created_at: string
  updated_at: string
}

export interface SpecAsset {
  asset_id: string
  variant_id: string | null
  label: string
  file_path: string
  file_name: string
  mime_type: string
  file_size: number | null
  is_shared: boolean
  version: number
  uploaded_by: string | null
  created_at: string
  // Joined
  uploaded_by_profile?: Profile
}

export interface SpecVersion {
  version_id: string
  variant_id: string
  index_rev: string | null
  blocks_snapshot: BlockContent[]
  metadata_snapshot: Record<string, any>
  change_description: string | null
  auto_changelog: ChangelogEntry[] | null
  generated_pdf_path: string | null
  created_by: string | null
  created_at: string
  // Joined
  created_by_profile?: Profile
}

// ----------------------------------------------------------------------------
// Block Content Types (JSONB shapes)
// ----------------------------------------------------------------------------

export type BlockContent =
  | SectionHeaderContent
  | SubsectionHeaderContent
  | KeyValueTableContent
  | DataTableContent
  | ImageContent
  | TextContent
  | PageBreakContent
  | PredefinedCoverContent
  | PredefinedTestConditionsContent
  | PredefinedProtectiveContent
  | PredefinedGeneralIndicesContent
  | PredefinedWarningsContent

export interface SectionHeaderContent {
  title: string
}

export interface SubsectionHeaderContent {
  title: string
}

export interface KeyValueRow {
  label: string
  value: string
}

export interface KeyValueTableContent {
  rows: KeyValueRow[]
}

export interface DataTableContent {
  columns: string[]
  rows: string[][]
}

export interface ImageContent {
  asset_id: string
  width_percent: number
  caption?: string
}

export interface TextContent {
  html: string
}

export interface PageBreakContent {
  // empty
}

export interface PredefinedCoverContent {
  // renders from variant + customer + contacts data
}

export interface PredefinedTestConditionsContent {
  // Environmental
  operating_temp?: string
  storage_temp?: string
  rated_max_ambient?: string
  operation_humidity?: string
  storage_humidity?: string
  water_protection?: string
  indication_protection?: string
  protection_class?: string
  operation_environment?: string
  // Input
  rated_input_voltage?: string
  extended_input_voltage?: string
  input_overvoltage_protection?: string
  rated_input_frequency?: string
  operable_frequency?: string
  input_current?: string
  input_power?: string
  standby_power?: string
  // Output
  charging_voltage_range?: string
  battery_configuration?: string
  charge_current?: string
  reverse_current?: string
  max_efficiency?: string
  power_factor?: string
}

export interface ProtectiveItem {
  type: string
  description: string
  threshold: string
}

export interface PredefinedProtectiveContent {
  items: ProtectiveItem[]
}

export interface GeneralIndexClause {
  id: string
  text: string
  enabled: boolean
}

export interface PredefinedGeneralIndicesContent {
  clauses: GeneralIndexClause[]
}

export interface PredefinedWarningsContent {
  text: string
}

// ----------------------------------------------------------------------------
// Contacts
// ----------------------------------------------------------------------------

export interface SpecContacts {
  sales?: string
  mech_eng?: string
  elec_eng?: string
  doc_eng?: string
  approver?: string
}

// ----------------------------------------------------------------------------
// Changelog
// ----------------------------------------------------------------------------

export interface ChangelogEntry {
  section: string
  field: string
  from: string
  to: string
}

// ----------------------------------------------------------------------------
// Computed / UI Types (not stored in DB)
// ----------------------------------------------------------------------------

/** A resolved field value with its inheritance source */
export interface ResolvedField<T = string> {
  value: T | null
  source: InheritanceSource | null
}

/** Block with computed numbering for display/PDF */
export interface NumberedBlock extends SpecBlock {
  number: string    // "1", "2", "3.1", "3.2", etc.
}

/** Variant with all joined relations loaded */
export interface SpecVariantFull extends SpecVariant {
  spec_products: SpecProduct
  spec_customers: SpecCustomer
  spec_market_configs: SpecMarketConfig
  blocks: SpecBlock[]
}

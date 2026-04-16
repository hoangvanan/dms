// ============================================================================
// Spec PDF — Block Renderers
// File: src/lib/spec-pdf/renderers.ts
//
// Each function takes a block's content + context → returns an HTML string.
// ============================================================================

import type {
  SpecBlock,
  SpecVariantFull,
  SpecContacts,
  SectionHeaderContent,
  SubsectionHeaderContent,
  KeyValueTableContent,
  DataTableContent,
  ImageContent,
  TextContent,
  PredefinedTestConditionsContent,
  PredefinedProtectiveContent,
  PredefinedGeneralIndicesContent,
  PredefinedWarningsContent,
  NumberedBlock,
} from '@/types/specs'
import { resolveContacts, formatSpecDate } from '@/lib/spec-helpers'

// ---- Escape HTML special chars ----
function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ============================================================================
// 1. Cover Page
// ============================================================================

export function renderCoverPage(
  variant: SpecVariantFull,
  _content: Record<string, any>
): string {
  const customer = variant.spec_customers
  const contacts: SpecContacts = resolveContacts(variant, customer ?? null)

  const infoRows = [
    ['Customer', customer?.name || '—'],
    ['Type Designation', variant.type_designation],
    ['UMEVS Part-No.', variant.umevs_part_no],
    ['Customer Part-No.', variant.customer_part_no || '—'],
    ['Date', formatSpecDate(variant.spec_date)],
    ['Index / Rev.', variant.current_index_rev || 'Original'],
  ]

  const contactRows = [
    ['Sales', contacts.sales],
    ['Mech. Engineering', contacts.mech_eng],
    ['Elec. Engineering', contacts.elec_eng],
    ['Doc. Engineering', contacts.doc_eng],
    ['Approved', contacts.approver],
  ]

  return `
    <div class="cover-content">
      <div class="cover-title-block">
        <div class="spec-type">${esc(variant.type_designation)}</div>
        <div class="spec-part-no">${esc(variant.umevs_part_no)}</div>
      </div>

      <div class="cover-section-title">Document Information</div>
      <table class="cover-info-table">
        ${infoRows.map(([label, value]) => `
          <tr>
            <td class="label">${esc(label)}</td>
            <td class="value">${esc(value)}</td>
          </tr>
        `).join('')}
      </table>

      <div class="cover-section-title">Contacts</div>
      <table class="cover-info-table">
        ${contactRows.map(([label, value]) => `
          <tr>
            <td class="label">${esc(label)}</td>
            <td class="value">${esc(value || '—')}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `
}

// ============================================================================
// 2. Section Header
// ============================================================================

export function renderSectionHeader(
  content: SectionHeaderContent,
  number: string
): string {
  return `<div class="section-header">${esc(number)} ${esc(content.title)}</div>`
}

// ============================================================================
// 3. Subsection Header
// ============================================================================

export function renderSubsectionHeader(
  content: SubsectionHeaderContent,
  number: string
): string {
  return `<div class="subsection-header">${esc(number)} ${esc(content.title)}</div>`
}

// ============================================================================
// 4. Key-Value Table
// ============================================================================

export function renderKeyValueTable(content: KeyValueTableContent): string {
  const rows = content.rows || []
  if (rows.length === 0) return ''

  return `
    <table class="kv-table">
      ${rows.map(r => `
        <tr>
          <td class="kv-label">${esc(r.label)}</td>
          <td class="kv-value">${esc(r.value)}</td>
        </tr>
      `).join('')}
    </table>
  `
}

// ============================================================================
// 5. Data Table
// ============================================================================

export function renderDataTable(content: DataTableContent): string {
  const columns = content.columns || []
  const rows = content.rows || []
  if (columns.length === 0) return ''

  return `
    <table class="data-table">
      <thead>
        <tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ============================================================================
// 6. Image (base64 embedded)
// ============================================================================

/**
 * Renders an image block. The base64Data must be pre-fetched and passed in.
 */
export function renderImage(
  content: ImageContent,
  base64Data: string | null,
  mimeType: string
): string {
  if (!base64Data) {
    return `<div class="image-block"><p style="color:#999;font-size:8pt;">[Image not available]</p></div>`
  }

  const width = content.width_percent || 100

  return `
    <div class="image-block">
      <img src="data:${mimeType};base64,${base64Data}" style="width:${width}%;" />
      ${content.caption ? `<div class="caption">${esc(content.caption)}</div>` : ''}
    </div>
  `
}

// ============================================================================
// 7. Text (rich text HTML)
// ============================================================================

export function renderText(content: TextContent): string {
  // content.html is already HTML from tiptap — pass through
  // but wrap in a styled div
  return `<div class="text-block">${content.html || ''}</div>`
}

// ============================================================================
// 8. Page Break
// ============================================================================

export function renderPageBreak(): string {
  // Sentinel — assemble.ts splits pages on this marker
  return `<!-- PAGE_BREAK -->`
}

// ============================================================================
// 9. Test Conditions (predefined)
// ============================================================================

export function renderTestConditions(
  content: PredefinedTestConditionsContent,
  number: string
): string {
  const envFields = [
    ['Operating Temperature', content.operating_temp],
    ['Storage Temperature', content.storage_temp],
    ['Rated Max Ambient', content.rated_max_ambient],
    ['Operation Humidity', content.operation_humidity],
    ['Storage Humidity', content.storage_humidity],
    ['Water Protection', content.water_protection],
    ['Indication Protection', content.indication_protection],
    ['Protection Class', content.protection_class],
    ['Operation Environment', content.operation_environment],
  ]

  const inputFields = [
    ['Rated Input Voltage', content.rated_input_voltage],
    ['Extended Input Voltage', content.extended_input_voltage],
    ['Input Overvoltage Protection', content.input_overvoltage_protection],
    ['Rated Input Frequency', content.rated_input_frequency],
    ['Operable Frequency', content.operable_frequency],
    ['Input Current', content.input_current],
    ['Input Power', content.input_power],
    ['Standby Power', content.standby_power],
  ]

  const outputFields = [
    ['Charging Voltage Range', content.charging_voltage_range],
    ['Battery Configuration', content.battery_configuration],
    ['Charge Current', content.charge_current],
    ['Reverse Current', content.reverse_current],
    ['Max Efficiency', content.max_efficiency],
    ['Power Factor', content.power_factor],
  ]

  const renderGroup = (title: string, fields: (string | undefined)[][]) => {
    const validFields = fields.filter(([, val]) => val)
    if (validFields.length === 0) return ''
    return `
      <div class="test-conditions-section">
        <div class="tc-group-title">${esc(title)}</div>
        <table class="kv-table">
          ${validFields.map(([label, value]) => `
            <tr>
              <td class="kv-label">${esc(label)}</td>
              <td class="kv-value">${esc(value)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
  }

  return `
    <div class="section-header">${esc(number)} General Test Conditions</div>
    ${renderGroup('Environmental', envFields)}
    ${renderGroup('Input Data', inputFields)}
    ${renderGroup('Output Data', outputFields)}
  `
}

// ============================================================================
// 10. Protective Functions (predefined)
// ============================================================================

export function renderProtectiveFunctions(
  content: PredefinedProtectiveContent,
  number: string
): string {
  const items = content.items || []
  if (items.length === 0) {
    return `<div class="section-header">${esc(number)} Protective Functions</div><p style="font-size:9pt;color:#666;">No protective functions defined.</p>`
  }

  return `
    <div class="section-header">${esc(number)} Protective Functions</div>
    <table class="protective-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Description</th>
          <th>Threshold</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${esc(item.type)}</td>
            <td>${esc(item.description)}</td>
            <td>${esc(item.threshold)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ============================================================================
// 11. General Indices (predefined)
// ============================================================================

export function renderGeneralIndices(
  content: PredefinedGeneralIndicesContent,
  number: string
): string {
  const clauses = (content.clauses || []).filter(c => c.enabled)
  if (clauses.length === 0) {
    return `<div class="section-header">${esc(number)} General Indices</div><p style="font-size:9pt;color:#666;">No clauses enabled.</p>`
  }

  return `
    <div class="section-header">${esc(number)} General Indices</div>
    <table class="indices-table">
      ${clauses.map(c => `
        <tr>
          <td class="clause-id">${esc(c.id)}</td>
          <td class="clause-text">${esc(c.text)}</td>
        </tr>
      `).join('')}
    </table>
  `
}

// ============================================================================
// 12. Warnings (predefined)
// ============================================================================

export function renderWarnings(
  content: PredefinedWarningsContent,
  number: string
): string {
  if (!content.text) {
    return `<div class="section-header">${esc(number)} Warnings</div>`
  }

  return `
    <div class="section-header">${esc(number)} Warnings</div>
    <div class="warnings-block">
      <p>${esc(content.text)}</p>
    </div>
  `
}

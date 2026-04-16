// ============================================================================
// Spec PDF — Block Renderers
// File: src/lib/spec-pdf/renderers.ts
// ============================================================================

import type {
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
// 1. Cover Page — matches PoC layout exactly
// ============================================================================

export function renderCoverPage(
  variant: SpecVariantFull,
  _content: Record<string, any>
): string {
  const customer = variant.spec_customers
  const contacts: SpecContacts = resolveContacts(variant, customer ?? null)

  const customerName = customer?.name || '—'
  const typeDesignation = variant.type_designation || '—'
  const umevsPartNo = variant.umevs_part_no || '—'
  const customerPartNo = variant.customer_part_no || '—'
  const date = formatSpecDate(variant.spec_date) || '—'

  return `
    <div class="cover-content">
      <table class="cover-table">
        <tr>
          <td class="label-bold">Company</td>
          <td class="value-bold">${esc(customerName)}</td>
        </tr>
        <tr class="spacer"><td></td><td></td></tr>

        <tr>
          <td class="label">Type:</td>
          <td class="value">${esc(typeDesignation)}</td>
        </tr>
        <tr>
          <td class="label">UMEVS Part-No.:</td>
          <td class="value">${esc(umevsPartNo)}</td>
        </tr>
        <tr>
          <td class="label">Customer Part-No.:</td>
          <td class="value">${esc(customerPartNo)}</td>
        </tr>
        <tr>
          <td class="label">Date:</td>
          <td class="value">${esc(date)}</td>
        </tr>
        <tr class="spacer"><td></td><td></td></tr>

        <tr>
          <td class="label">Contact Sales:</td>
          <td class="value">${esc(contacts.sales || '')}</td>
        </tr>
        <tr>
          <td class="label">Contact Mech. Eng.:</td>
          <td class="value">${esc(contacts.mech_eng || '')}</td>
        </tr>
        <tr>
          <td class="label">Contact Elec. Eng.:</td>
          <td class="value">${esc(contacts.elec_eng || '')}</td>
        </tr>
        <tr>
          <td class="label">Contact Doc. Eng.:</td>
          <td class="value">${esc(contacts.doc_eng || '')}</td>
        </tr>
        <tr>
          <td class="label">Approved</td>
          <td class="value">${esc(contacts.approver || '')}</td>
        </tr>
      </table>

      <p class="cover-disclaimer">
        We may ask you to return one signed copy of the specification for our records as having your approval. Unless you do not
        enter your objection to the latest specification issue without delay, your acceptance and release for production on the basis of
        this specification is deemed to be given
      </p>

      <div class="cover-release-block">
        <div class="release-line">Customer Release:</div>
        <div class="release-line">Date:</div>
        <div class="release-line">Signature:</div>
      </div>

      <table class="revision-history">
        <thead>
          <tr>
            <th class="col-idx">Index /<br>Rev.</th>
            <th class="col-date">Date</th>
            <th class="col-name">Name</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td></tr>
        </tbody>
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
  return `
    <div class="section-header">
      <span class="sec-num">${esc(number)}</span>
      <span class="sec-title">${esc(content.title)}</span>
    </div>
  `
}

// ============================================================================
// 3. Subsection Header
// ============================================================================

export function renderSubsectionHeader(
  content: SubsectionHeaderContent,
  number: string
): string {
  return `
    <div class="subsection-header">
      <span class="sec-num">${esc(number)}</span>
      <span class="sec-title">${esc(content.title)}</span>
    </div>
  `
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
          <td class="kv-label">${esc(r.label)}${r.label && !r.label.trim().endsWith(':') ? ':' : ''}</td>
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
// 6. Image — uses signed URL (not base64) to reduce memory footprint
// ============================================================================

/**
 * Renders an image block. The imageUrl must be a pre-created signed URL
 * pointing to the spec-assets bucket. Pass null if the image is missing.
 */
export function renderImage(
  content: ImageContent,
  imageUrl: string | null
): string {
  if (!imageUrl) {
    return `<div class="image-block"><p style="color:#999;font-size:8pt;">[Image not available]</p></div>`
  }

  const width = content.width_percent || 100

  return `
    <div class="image-block">
      <img src="${esc(imageUrl)}" style="width:${width}%;" crossorigin="anonymous" />
      ${content.caption ? `<div class="caption">${esc(content.caption)}</div>` : ''}
    </div>
  `
}

// ============================================================================
// 7. Text (rich text HTML)
// ============================================================================

export function renderText(content: TextContent): string {
  return `<div class="text-block">${content.html || ''}</div>`
}

// ============================================================================
// 8. Page Break (sentinel marker)
// ============================================================================

export function renderPageBreak(): string {
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
    ['Operating temperature', content.operating_temp],
    ['Storage temperature', content.storage_temp],
    ['Rated maximum ambient', content.rated_max_ambient],
    ['Operation Humidity', content.operation_humidity],
    ['Storage Humidity', content.storage_humidity],
    ['Water protection', content.water_protection],
    ['Indication of protection', content.indication_protection],
    ['Protection class', content.protection_class],
    ['Operation Environment', content.operation_environment],
  ]

  const inputFields = [
    ['Rated input voltage', content.rated_input_voltage],
    ['Extended input voltage range', content.extended_input_voltage],
    ['Input overvoltage protection', content.input_overvoltage_protection],
    ['Rated input frequency', content.rated_input_frequency],
    ['Operable frequency range', content.operable_frequency],
    ['Input current', content.input_current],
    ['Input power', content.input_power],
    ['Standby power', content.standby_power],
  ]

  const outputFields = [
    ['Charging voltage Range', content.charging_voltage_range],
    ['Battery configuration', content.battery_configuration],
    ['Charge current', content.charge_current],
    ['Reverse current', content.reverse_current],
    ['Max efficiency', content.max_efficiency],
    ['Power factor (PF)', content.power_factor],
  ]

  const renderKvRows = (fields: (string | undefined)[][]): string => {
    const valid = fields.filter(([, v]) => v && String(v).trim())
    if (valid.length === 0) return ''
    return `
      <table class="kv-table">
        ${valid.map(([label, value]) => `
          <tr>
            <td class="kv-label">${esc(label)}:</td>
            <td class="kv-value">${esc(value)}</td>
          </tr>
        `).join('')}
      </table>
    `
  }

  const envHtml = renderKvRows(envFields)
  const inputHtml = renderKvRows(inputFields)
  const outputHtml = renderKvRows(outputFields)

  let html = `
    <div class="section-header">
      <span class="sec-num">${esc(number)}</span>
      <span class="sec-title">General test conditions</span>
    </div>
    <p class="tc-prefix">All values listed below are measured at an ambient temperature of +20°C and after 15 minutes of operation.</p>
    ${envHtml}
  `

  if (inputHtml) {
    html += `
      <div class="subsection-header">
        <span class="sec-num">${esc(number)}.1</span>
        <span class="sec-title">Input data</span>
      </div>
      ${inputHtml}
    `
  }

  if (outputHtml) {
    html += `
      <div class="subsection-header">
        <span class="sec-num">${esc(number)}.2</span>
        <span class="sec-title">Output data</span>
      </div>
      ${outputHtml}
    `
  }

  return html
}

// ============================================================================
// 10. Protective Functions (predefined)
// ============================================================================

export function renderProtectiveFunctions(
  content: PredefinedProtectiveContent,
  number: string
): string {
  const items = content.items || []
  const header = `
    <div class="section-header">
      <span class="sec-num">${esc(number)}</span>
      <span class="sec-title">Protective Functions</span>
    </div>
  `

  if (items.length === 0) {
    return header + `<p style="font-size:9pt;color:#666;margin-left:8mm;">No protective functions defined.</p>`
  }

  return `
    ${header}
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
  const header = `
    <div class="section-header">
      <span class="sec-num">${esc(number)}</span>
      <span class="sec-title">General Indices</span>
    </div>
  `

  if (clauses.length === 0) {
    return header + `<p style="font-size:9pt;color:#666;margin-left:8mm;">No clauses enabled.</p>`
  }

  return `
    ${header}
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
  const header = `
    <div class="section-header">
      <span class="sec-num">${esc(number)}</span>
      <span class="sec-title">Warnings</span>
    </div>
  `

  if (!content.text) return header

  return `
    ${header}
    <div class="warnings-block">
      <p>${esc(content.text)}</p>
    </div>
  `
}

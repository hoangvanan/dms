// ============================================================================
// Spec PDF — HTML Assembly
// File: src/lib/spec-pdf/assemble.ts
//
// Builds the full HTML document matching PoC layout:
//   - Content box: 196×275mm, 7mm top/left/right, 15mm bottom from page edges
//   - Header inside border, footer outside
//   - Cover page: company address (Gurugram) + large "Specification" title
//   - Non-cover: customer/type/part-no header
//   - Watermark "P R E L I M I N A R Y" (spaced letters) for non-released specs
//   - Footer: www.unominda.com | Index / Rev.: X | Page N of M
//
// Images are rendered via Supabase signed URLs (not base64) to reduce memory
// usage when Chromium processes the HTML. This keeps the HTML input small and
// lets Chromium stream images one at a time.
// ============================================================================

import { createServerClient } from '@/lib/supabase-server'
import { computeBlockNumbering, getWatermarkText } from '@/lib/spec-helpers'
import { getPdfCss } from './styles'
import {
  renderCoverPage,
  renderSectionHeader,
  renderSubsectionHeader,
  renderKeyValueTable,
  renderDataTable,
  renderImage,
  renderText,
  renderPageBreak,
  renderTestConditions,
  renderProtectiveFunctions,
  renderGeneralIndices,
  renderWarnings,
} from './renderers'
import type {
  SpecVariantFull,
  NumberedBlock,
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

// ============================================================================
// Constants — company info (hardcoded per PoC reference)
// ============================================================================

const COMPANY_NAME = 'UNO MINDA EV SYSTEMS PVT. LTD.'
const COMPANY_ADDRESS_LINE_1 = 'Village – Saidpur Mohammadpur, Teh. – Farrukhnagar'
const COMPANY_ADDRESS_LINE_2 = 'Distt. – Gurugram, Haryana - 122505, India'
const COMPANY_WEBSITE = 'www.unominda.com'

// Signed URL expiry — PDF generation must complete within this window
const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes

// ============================================================================
// Fetch helpers
// ============================================================================

async function fetchVariantForPdf(variantId: string): Promise<SpecVariantFull | null> {
  const supabase = createServerClient()

  const { data: variant, error } = await supabase
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

  if (error || !variant) return null

  const { data: blocks } = await supabase
    .from('spec_blocks')
    .select('*')
    .eq('variant_id', variantId)
    .order('sort_order', { ascending: true })

  return { ...variant, blocks: blocks || [] } as SpecVariantFull
}

/**
 * Create a short-lived signed URL for a file in the spec-assets bucket.
 * Returns empty string on error so the caller can fall back gracefully.
 */
async function createSignedUrl(filePath: string): Promise<string> {
  const supabase = createServerClient()

  const { data, error } = await supabase.storage
    .from('spec-assets')
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    console.error('createSignedUrl error:', filePath, error)
    return ''
  }

  return data.signedUrl
}

/**
 * Find the shared logo and return its signed URL.
 */
async function fetchLogoUrl(): Promise<string> {
  const supabase = createServerClient()

  const { data: assets } = await supabase
    .from('spec_assets')
    .select('file_path')
    .eq('is_shared', true)
    .ilike('label', '%logo%')
    .limit(1)

  if (assets && assets.length > 0) {
    return await createSignedUrl(assets[0].file_path)
  }

  return ''
}

// ============================================================================
// Render a single block to HTML
// ============================================================================

async function renderBlock(
  block: NumberedBlock,
  variant: SpecVariantFull
): Promise<string> {
  const content = block.content as any

  switch (block.block_type) {
    case 'predefined_cover':
      return renderCoverPage(variant, content)

    case 'section_header':
      return renderSectionHeader(content as SectionHeaderContent, block.number)

    case 'subsection_header':
      return renderSubsectionHeader(content as SubsectionHeaderContent, block.number)

    case 'key_value_table':
      return renderKeyValueTable(content as KeyValueTableContent)

    case 'data_table':
      return renderDataTable(content as DataTableContent)

    case 'image': {
      const imgContent = content as ImageContent
      if (!imgContent.asset_id) {
        return renderImage(imgContent, null)
      }
      const supabase = createServerClient()
      const { data: asset } = await supabase
        .from('spec_assets')
        .select('file_path, mime_type')
        .eq('asset_id', imgContent.asset_id)
        .single()

      if (!asset) return renderImage(imgContent, null)

      const signedUrl = await createSignedUrl(asset.file_path)
      return renderImage(imgContent, signedUrl || null)
    }

    case 'text':
      return renderText(content as TextContent)

    case 'page_break':
      return renderPageBreak()

    case 'predefined_test_conditions':
      return renderTestConditions(content as PredefinedTestConditionsContent, block.number)

    case 'predefined_protective':
      return renderProtectiveFunctions(content as PredefinedProtectiveContent, block.number)

    case 'predefined_general_indices':
      return renderGeneralIndices(content as PredefinedGeneralIndicesContent, block.number)

    case 'predefined_warnings':
      return renderWarnings(content as PredefinedWarningsContent, block.number)

    default:
      return `<!-- Unknown block type: ${block.block_type} -->`
  }
}

// ============================================================================
// Header / Footer builders
// ============================================================================

function buildPageHeader(variant: SpecVariantFull, logoUrl: string): string {
  const customerName = variant.spec_customers?.name || ''
  return `
    <div class="page-header">
      ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo" />` : ''}
      <div class="header-lines">
        <div class="header-line"><span class="hlabel">Company:</span>${esc(customerName)}</div>
        <div class="header-line"><span class="hlabel">Type:</span>${esc(variant.type_designation)}</div>
        <div class="header-line"><span class="hlabel">Part-No.:</span>${esc(variant.umevs_part_no)}</div>
      </div>
      <div class="header-title">Specification</div>
    </div>
  `
}

function buildCoverHeader(logoUrl: string): string {
  return `
    <div class="cover-header">
      ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo" />` : ''}
      <div class="cover-header-text">
        <div class="cover-company-name">${esc(COMPANY_NAME)}</div>
        <div class="cover-address">${esc(COMPANY_ADDRESS_LINE_1)}</div>
        <div class="cover-address">${esc(COMPANY_ADDRESS_LINE_2)}</div>
      </div>
      <div class="cover-title">Specification</div>
    </div>
  `
}

function buildFooter(variant: SpecVariantFull, pageIdx: number, totalPages: number): string {
  const indexRev = variant.current_index_rev || ''
  return `
    <div class="page-footer">
      <span>${esc(COMPANY_WEBSITE)}</span>
      <span class="footer-center">Index / Rev.: ${esc(indexRev)}</span>
      <span>Page ${pageIdx} of ${totalPages}</span>
    </div>
  `
}

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ============================================================================
// Main assembly
// ============================================================================

export async function assembleSpecHtml(variantId: string): Promise<{
  html: string
  variant: SpecVariantFull
} | null> {
  const variant = await fetchVariantForPdf(variantId)
  if (!variant) return null

  const numberedBlocks = computeBlockNumbering(variant.blocks)
  const logoUrl = await fetchLogoUrl()

  // Render all blocks
  const fragments: string[] = []
  for (const block of numberedBlocks) {
    const html = await renderBlock(block, variant)
    fragments.push(html)
  }

  // Split into pages on PAGE_BREAK markers
  const pages: { isCover: boolean; html: string }[] = []
  let currentFragments: string[] = []
  let isFirstPage = true

  const hasCover = numberedBlocks.length > 0 && numberedBlocks[0].block_type === 'predefined_cover'

  for (const fragment of fragments) {
    if (fragment.includes('<!-- PAGE_BREAK -->')) {
      if (currentFragments.length > 0) {
        pages.push({
          isCover: isFirstPage && hasCover,
          html: currentFragments.join('\n'),
        })
        currentFragments = []
        isFirstPage = false
      }
    } else {
      currentFragments.push(fragment)
    }
  }
  if (currentFragments.length > 0) {
    pages.push({
      isCover: isFirstPage && hasCover,
      html: currentFragments.join('\n'),
    })
  }

  if (pages.length === 0) {
    pages.push({ isCover: hasCover, html: '<p style="color:#999;">No content.</p>' })
  }

  const watermarkText = getWatermarkText(variant.status)
  const coverHeader = buildCoverHeader(logoUrl)
  const pageHeader = buildPageHeader(variant, logoUrl)
  const totalPages = pages.length

  const pagesHtml = pages.map((page, idx) => {
    const header = page.isCover ? coverHeader : pageHeader
    const watermark = watermarkText
      ? `<div class="watermark">${esc(watermarkText)}</div>`
      : ''
    const footer = buildFooter(variant, idx + 1, totalPages)

    return `
      <div class="page">
        <div class="page-border">
          ${header}
          ${watermark}
          <div class="page-content ${page.isCover ? 'cover-content' : ''}">
            ${page.html}
          </div>
        </div>
        ${footer}
      </div>
    `
  }).join('\n')

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getPdfCss()}</style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`

  return { html: fullHtml, variant }
}

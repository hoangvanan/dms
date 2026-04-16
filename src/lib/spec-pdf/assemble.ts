// ============================================================================
// Spec PDF — HTML Assembly
// File: src/lib/spec-pdf/assemble.ts
//
// Queries all data for a variant, renders each block → HTML fragments,
// assembles into a full HTML document ready for Puppeteer.
// ============================================================================

import { createServerClient } from '@/lib/supabase-server'
import { computeBlockNumbering, resolveContacts, formatSpecDate, getWatermarkText } from '@/lib/spec-helpers'
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
  SpecBlock,
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
// Fetch all data needed for PDF
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

// ============================================================================
// Fetch image as base64 for embedding
// ============================================================================

async function fetchImageBase64(filePath: string): Promise<{ data: string; mimeType: string } | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase.storage
    .from('spec-assets')
    .download(filePath)

  if (error || !data) return null

  const arrayBuffer = await data.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = data.type || 'image/png'

  return { data: base64, mimeType }
}

// ============================================================================
// Fetch logo as base64
// ============================================================================

async function fetchLogo(): Promise<string> {
  const supabase = createServerClient()

  // Try to find the logo in shared assets
  const { data: assets } = await supabase
    .from('spec_assets')
    .select('file_path, mime_type')
    .eq('is_shared', true)
    .ilike('label', '%logo%')
    .limit(1)

  if (assets && assets.length > 0) {
    const result = await fetchImageBase64(assets[0].file_path)
    if (result) {
      return `data:${result.mimeType};base64,${result.data}`
    }
  }

  // Fallback: no logo
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
        return renderImage(imgContent, null, 'image/png')
      }
      // Fetch the asset record to get file_path
      const supabase = createServerClient()
      const { data: asset } = await supabase
        .from('spec_assets')
        .select('file_path, mime_type')
        .eq('asset_id', imgContent.asset_id)
        .single()

      if (!asset) return renderImage(imgContent, null, 'image/png')

      const imgData = await fetchImageBase64(asset.file_path)
      return renderImage(
        imgContent,
        imgData?.data || null,
        imgData?.mimeType || asset.mime_type || 'image/png'
      )
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
// Build non-cover page header HTML
// ============================================================================

function buildPageHeader(variant: SpecVariantFull, logoDataUri: string): string {
  return `
    <div class="page-header">
      ${logoDataUri ? `<img class="logo" src="${logoDataUri}" />` : ''}
      <div class="header-info">
        <div class="company-name">UNO Minda EV Systems Pvt. Ltd.</div>
        <div class="header-meta">Type: ${esc(variant.type_designation)}</div>
        <div class="header-meta">Part-No.: ${esc(variant.umevs_part_no)}</div>
      </div>
      <div class="header-title">Specification</div>
    </div>
  `
}

// ============================================================================
// Build cover page header HTML
// ============================================================================

function buildCoverHeader(logoDataUri: string): string {
  return `
    <div class="cover-header">
      ${logoDataUri ? `<img class="logo" src="${logoDataUri}" />` : ''}
      <div class="cover-header-text">
        <div class="cover-company-name">UNO Minda EV Systems Pvt. Ltd.</div>
        <div class="cover-address">VSIP II-A, Tan Uyen City, Binh Duong Province, Vietnam</div>
      </div>
      <div class="cover-title">Specification</div>
    </div>
  `
}

// ============================================================================
// Build footer HTML (page number will be filled by Puppeteer)
// ============================================================================

function buildFooter(variant: SpecVariantFull): string {
  const indexRev = variant.current_index_rev || 'Original'
  return `
    <div class="page-footer">
      <span>www.unominda.com</span>
      <span>Index / Rev.: ${esc(indexRev)}</span>
      <span class="page-number-placeholder"></span>
    </div>
  `
}

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ============================================================================
// Main assembly function
// ============================================================================

export async function assembleSpecHtml(variantId: string): Promise<{
  html: string
  variant: SpecVariantFull
} | null> {
  // 1. Fetch all data
  const variant = await fetchVariantForPdf(variantId)
  if (!variant) return null

  // 2. Compute block numbering
  const numberedBlocks = computeBlockNumbering(variant.blocks)

  // 3. Fetch logo
  const logoDataUri = await fetchLogo()

  // 4. Render all blocks to HTML fragments
  const fragments: string[] = []
  for (const block of numberedBlocks) {
    const html = await renderBlock(block, variant)
    fragments.push(html)
  }

  // 5. Split into pages at PAGE_BREAK markers
  // Group fragments into pages. First page = cover (if first block is cover).
  const pages: { isCover: boolean; html: string }[] = []
  let currentFragments: string[] = []
  let isFirstPage = true

  const hasCover = numberedBlocks.length > 0 && numberedBlocks[0].block_type === 'predefined_cover'

  for (const fragment of fragments) {
    if (fragment.includes('<!-- PAGE_BREAK -->')) {
      // Commit current page
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
  // Last page
  if (currentFragments.length > 0) {
    pages.push({
      isCover: isFirstPage && hasCover,
      html: currentFragments.join('\n'),
    })
  }

  // If no explicit page breaks, all content is on one or more auto pages
  // Puppeteer handles overflow → new pages, but we need at least the header/footer structure
  if (pages.length === 0) {
    pages.push({ isCover: hasCover, html: '<p style="color:#999;">No content.</p>' })
  }

  // 6. Watermark
  const watermarkText = getWatermarkText(variant.status)

  // 7. Assemble full HTML
  const coverHeader = buildCoverHeader(logoDataUri)
  const pageHeader = buildPageHeader(variant, logoDataUri)
  const footer = buildFooter(variant)

  const pagesHtml = pages.map((page, idx) => {
    const header = page.isCover ? coverHeader : pageHeader
    const watermark = watermarkText ? `<div class="watermark">${esc(watermarkText)}</div>` : ''

    return `
      <div class="page">
        ${header}
        ${watermark}
        <div class="page-content ${page.isCover ? 'cover-content' : ''}">
          ${page.html}
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

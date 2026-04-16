// ============================================================================
// Spec PDF Generation API Route
// File: src/app/api/specs/[id]/generate/route.ts
//
// POST /api/specs/{variantId}/generate
// Generates PDF via Puppeteer, uploads to Supabase Storage,
// updates spec_variants.current_pdf_path.
// Returns the PDF as binary download.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { assembleSpecHtml } from '@/lib/spec-pdf/assemble'

export const maxDuration = 60 // Vercel Pro: 60s
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const variantId = params.id

  if (!variantId) {
    return NextResponse.json({ error: 'Missing variant ID' }, { status: 400 })
  }

  try {
    // 1. Assemble HTML
    const result = await assembleSpecHtml(variantId)
    if (!result) {
      return NextResponse.json({ error: 'Specification not found' }, { status: 404 })
    }

    const { html, variant } = result

    // 2. Launch Puppeteer
    let browser
    try {
      // Dynamic imports to avoid bundling issues
      const chromium = (await import('@sparticuz/chromium-min')).default
      const puppeteer = (await import('puppeteer-core')).default

      browser = await puppeteer.launch({
        args: [...chromium.args, '--disable-gpu'],
        executablePath: await chromium.executablePath(
          'https://github.com/nicholasgasior/chromium-brotli-lambda-layer/releases/download/v133.0.0/chromium-v133.0.0-pack.tar'
        ),
        headless: true,
      })

      const page = await browser.newPage()

      // Set content and wait for images to load
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <div style="width:100%;font-size:7pt;font-family:Arial,sans-serif;color:#555;padding:0 15mm;display:flex;justify-content:flex-end;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
        margin: {
          top: '0mm',
          bottom: '14mm',
          left: '0mm',
          right: '0mm',
        },
      })

      await browser.close()
      browser = null

      // 3. Upload PDF to Supabase Storage
      const supabase = createServerClient()
      const timestamp = Date.now()
      const safeName = variant.type_designation.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `generated-pdfs/${variantId}/${timestamp}_${safeName}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('spec-assets')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        console.error('PDF upload error:', uploadError)
        // Still return the PDF even if storage upload fails
      } else {
        // Update variant's current_pdf_path
        await supabase
          .from('spec_variants')
          .update({ current_pdf_path: storagePath })
          .eq('variant_id', variantId)
      }

      // 4. Return PDF as binary response
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeName}_spec.pdf"`,
        },
      })
    } finally {
      if (browser) {
        try { await browser.close() } catch { /* ignore */ }
      }
    }
  } catch (err: any) {
    console.error('PDF generation error:', err)
    return NextResponse.json(
      { error: err.message || 'PDF generation failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/specs/{variantId}/generate — Preview HTML (for debugging / preview tab)
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const variantId = params.id

  if (!variantId) {
    return NextResponse.json({ error: 'Missing variant ID' }, { status: 400 })
  }

  try {
    const result = await assembleSpecHtml(variantId)
    if (!result) {
      return NextResponse.json({ error: 'Specification not found' }, { status: 404 })
    }

    // Return raw HTML for preview
    return new NextResponse(result.html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    console.error('Preview error:', err)
    return NextResponse.json(
      { error: err.message || 'Preview generation failed' },
      { status: 500 }
    )
  }
}

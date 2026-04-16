// ============================================================================
// Spec PDF Generation API Route
// File: src/app/api/specs/[id]/generate/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { assembleSpecHtml } from '@/lib/spec-pdf/assemble'

export const maxDuration = 60
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
    const result = await assembleSpecHtml(variantId)
    if (!result) {
      return NextResponse.json({ error: 'Specification not found' }, { status: 404 })
    }

    const { html, variant } = result

    let browser
    try {
      const chromium = (await import('@sparticuz/chromium-min')).default
      const puppeteer = (await import('puppeteer-core')).default

      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
        ],
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar'
        ),
        headless: true,
      })

      const page = await browser.newPage()

      // Images are referenced via signed URLs, so Chromium will fetch them.
      // networkidle0 waits until there are no network connections for 500ms
      // after setContent — ensures all images are fully loaded before PDF.
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 45000,
      })

      // Page numbering is rendered directly in the HTML footer, so we disable
      // Puppeteer's built-in header/footer to avoid duplication.
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: {
          top: '0mm',
          bottom: '0mm',
          left: '0mm',
          right: '0mm',
        },
      })

      await browser.close()
      browser = null

      // Upload PDF to storage
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
      } else {
        await supabase
          .from('spec_variants')
          .update({ current_pdf_path: storagePath })
          .eq('variant_id', variantId)
      }

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
// GET /api/specs/{variantId}/generate — Preview HTML (no Puppeteer)
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

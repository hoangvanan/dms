// ============================================================================
// Spec PDF — CSS Styles
// File: src/lib/spec-pdf/styles.ts
// ============================================================================

/**
 * PDF CSS for A4 spec documents.
 * Font: Arial only (no commercial fonts).
 * Layout: A4 portrait, 15mm margins, header/footer on every page.
 */
export function getPdfCss(): string {
  return `
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #1a1a1a;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ---- Page container ---- */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 28mm 15mm 22mm 15mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* ---- Header (top of every page) ---- */
    .page-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 24mm;
      padding: 4mm 15mm;
      border-bottom: 0.5pt solid #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .page-header .logo {
      height: 16mm;
      object-fit: contain;
    }

    .page-header .header-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .page-header .company-name {
      font-size: 8pt;
      font-weight: bold;
      color: #1a1a1a;
    }

    .page-header .header-meta {
      font-size: 7pt;
      color: #555;
    }

    .page-header .header-title {
      font-size: 10pt;
      font-weight: bold;
      text-align: right;
      color: #1a1a1a;
      white-space: nowrap;
    }

    /* ---- Cover page header (full company info) ---- */
    .cover-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 28mm;
      padding: 4mm 15mm;
      border-bottom: 0.5pt solid #333;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .cover-header .logo {
      height: 20mm;
      object-fit: contain;
    }

    .cover-header .cover-header-text {
      flex: 1;
    }

    .cover-header .cover-company-name {
      font-size: 10pt;
      font-weight: bold;
      color: #1a1a1a;
    }

    .cover-header .cover-address {
      font-size: 7pt;
      color: #555;
      margin-top: 2px;
    }

    .cover-header .cover-title {
      font-size: 14pt;
      font-weight: bold;
      text-align: right;
      color: #1a1a1a;
    }

    /* ---- Footer (bottom of every page) ---- */
    .page-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 14mm;
      padding: 3mm 15mm;
      border-top: 0.5pt solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      color: #555;
    }

    /* ---- Watermark ---- */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 72pt;
      font-weight: bold;
      color: rgba(200, 200, 200, 0.25);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }

    /* ---- Content area ---- */
    .page-content {
      position: relative;
      z-index: 1;
    }

    /* ---- Cover page content ---- */
    .cover-content {
      padding-top: 8mm;
    }

    .cover-title-block {
      text-align: center;
      margin-bottom: 10mm;
    }

    .cover-title-block .spec-type {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 3mm;
    }

    .cover-title-block .spec-part-no {
      font-size: 10pt;
      color: #555;
    }

    .cover-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6mm;
    }

    .cover-info-table td {
      padding: 2.5mm 4mm;
      font-size: 9pt;
      border-bottom: 0.5pt solid #ddd;
      vertical-align: top;
    }

    .cover-info-table .label {
      width: 40%;
      font-weight: bold;
      color: #333;
    }

    .cover-info-table .value {
      color: #1a1a1a;
    }

    .cover-section-title {
      font-size: 10pt;
      font-weight: bold;
      color: #1a1a1a;
      margin: 6mm 0 3mm 0;
      padding-bottom: 1.5mm;
      border-bottom: 0.5pt solid #333;
    }

    /* ---- Section header ---- */
    .section-header {
      font-size: 11pt;
      font-weight: bold;
      color: #1a1a1a;
      margin: 5mm 0 3mm 0;
      padding-bottom: 1.5mm;
      border-bottom: 0.5pt solid #999;
    }

    /* ---- Subsection header ---- */
    .subsection-header {
      font-size: 10pt;
      font-weight: bold;
      color: #333;
      margin: 4mm 0 2mm 0;
    }

    /* ---- Key-Value table ---- */
    .kv-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 4mm 0;
    }

    .kv-table td {
      padding: 1.8mm 4mm;
      font-size: 9pt;
      border-bottom: 0.3pt solid #e0e0e0;
      vertical-align: top;
    }

    .kv-table .kv-label {
      width: 40%;
      font-weight: 600;
      color: #333;
    }

    .kv-table .kv-value {
      color: #1a1a1a;
    }

    /* ---- Data table ---- */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 4mm 0;
    }

    .data-table th {
      padding: 2mm 4mm;
      font-size: 8pt;
      font-weight: bold;
      text-align: left;
      background: #f0f0f0;
      border: 0.3pt solid #ccc;
      color: #333;
    }

    .data-table td {
      padding: 1.8mm 4mm;
      font-size: 9pt;
      border: 0.3pt solid #ddd;
      vertical-align: top;
    }

    /* ---- Image block ---- */
    .image-block {
      margin: 3mm 0 4mm 0;
      text-align: center;
    }

    .image-block img {
      max-height: 180mm;
      object-fit: contain;
    }

    .image-block .caption {
      font-size: 8pt;
      color: #666;
      margin-top: 2mm;
      font-style: italic;
    }

    /* ---- Text block ---- */
    .text-block {
      margin: 2mm 0 3mm 0;
      font-size: 9pt;
      line-height: 1.5;
    }

    .text-block p {
      margin: 0 0 2mm 0;
    }

    .text-block p:last-child {
      margin-bottom: 0;
    }

    /* ---- Protective functions table ---- */
    .protective-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 4mm 0;
    }

    .protective-table th {
      padding: 2mm 4mm;
      font-size: 8pt;
      font-weight: bold;
      text-align: left;
      background: #f0f0f0;
      border: 0.3pt solid #ccc;
      color: #333;
    }

    .protective-table td {
      padding: 1.8mm 4mm;
      font-size: 9pt;
      border: 0.3pt solid #ddd;
    }

    /* ---- General indices ---- */
    .indices-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 4mm 0;
    }

    .indices-table td {
      padding: 1.8mm 4mm;
      font-size: 9pt;
      border-bottom: 0.3pt solid #e0e0e0;
      vertical-align: top;
    }

    .indices-table .clause-id {
      width: 12%;
      font-weight: bold;
      color: #333;
    }

    .indices-table .clause-text {
      color: #1a1a1a;
    }

    /* ---- Warnings ---- */
    .warnings-block {
      margin: 3mm 0 4mm 0;
      padding: 3mm 5mm;
      border: 0.5pt solid #cc0000;
      border-radius: 2mm;
      background: #fff5f5;
    }

    .warnings-block p {
      font-size: 9pt;
      color: #cc0000;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    /* ---- Test conditions ---- */
    .test-conditions-section {
      margin-bottom: 4mm;
    }

    .test-conditions-section .tc-group-title {
      font-size: 9pt;
      font-weight: bold;
      color: #555;
      margin: 3mm 0 1.5mm 0;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }
  `
}

// ============================================================================
// Spec PDF — CSS Styles
// File: src/lib/spec-pdf/styles.ts
//
// A4 portrait. Content box: 196×275mm, offset 7mm from top/left/right, 15mm from bottom.
// Header line uses negative margins to span full border width.
// Font: Arial only.
// ============================================================================

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
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ---- Page container ----
       A4: 210 × 297 mm
       Border box: 196 × 275 mm
       Offsets: 7mm top/left/right, 15mm bottom
       Body padding inside border: 4mm ---- */
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* Border box — wraps header + body */
    .page-border {
      position: absolute;
      top: 7mm;
      left: 7mm;
      width: 196mm;
      height: 275mm;
      border: 0.5pt solid #000;
      padding: 4mm;
      overflow: hidden;
    }

    /* ---- Header (inside border) ---- */
    /* Non-cover header: compact, 3 lines of customer/type/part-no */
    .page-header {
      display: flex;
      align-items: center;
      gap: 8mm;
      padding-bottom: 3mm;
      /* Negative margins to let border-bottom span full content box width */
      margin: 0 -4mm;
      padding-left: 4mm;
      padding-right: 4mm;
      border-bottom: 0.5pt solid #000;
    }

    .page-header .logo {
      height: 12mm;
      object-fit: contain;
      flex-shrink: 0;
    }

    .page-header .header-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
    }

    .page-header .header-line {
      font-size: 8pt;
      color: #1a1a1a;
    }

    .page-header .header-line .hlabel {
      display: inline-block;
      width: 18mm;
      color: #333;
    }

    .page-header .header-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1a1a1a;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Cover page header: taller, company name + address */
    .cover-header {
      display: flex;
      align-items: center;
      gap: 8mm;
      padding-bottom: 3mm;
      margin: 0 -4mm;
      padding-left: 4mm;
      padding-right: 4mm;
      border-bottom: 0.5pt solid #000;
    }

    .cover-header .logo {
      height: 16mm;
      object-fit: contain;
      flex-shrink: 0;
    }

    .cover-header .cover-header-text {
      flex: 1;
    }

    .cover-header .cover-company-name {
      font-size: 10pt;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
    }

    .cover-header .cover-address {
      font-size: 7.5pt;
      color: #333;
      margin-top: 0.5mm;
      line-height: 1.3;
    }

    .cover-header .cover-title {
      font-size: 16pt;
      font-weight: bold;
      color: #1a1a1a;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ---- Content area (inside border) ---- */
    .page-content {
      position: relative;
      padding-top: 4mm;
      z-index: 1;
    }

    /* ---- Footer (outside border) ---- */
    .page-footer {
      position: absolute;
      bottom: 6mm;
      left: 7mm;
      width: 196mm;
      padding: 0 2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #333;
      z-index: 2;
    }

    .page-footer .footer-center {
      flex: 1;
      text-align: center;
    }

    /* ---- Watermark ---- */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 64pt;
      font-weight: bold;
      color: rgba(200, 200, 200, 0.28);
      white-space: nowrap;
      pointer-events: none;
      letter-spacing: 0.4em;
      z-index: 0;
    }

    /* ============================================================ */
    /* COVER PAGE CONTENT */
    /* ============================================================ */

    .cover-content {
      padding-top: 2mm;
    }

    .cover-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2mm;
    }

    .cover-table td {
      padding: 1.8mm 2mm;
      font-size: 9pt;
      vertical-align: top;
      line-height: 1.35;
    }

    .cover-table td.label {
      width: 42%;
      font-weight: normal;
      color: #1a1a1a;
    }

    .cover-table td.label-bold {
      width: 42%;
      font-weight: bold;
      color: #1a1a1a;
    }

    .cover-table td.value {
      color: #1a1a1a;
    }

    .cover-table td.value-bold {
      color: #1a1a1a;
      font-weight: bold;
    }

    /* Section separator row — small gap */
    .cover-table tr.spacer td {
      padding: 1.5mm 2mm;
    }

    /* Disclaimer paragraph */
    .cover-disclaimer {
      margin-top: 5mm;
      font-size: 9pt;
      line-height: 1.4;
      color: #1a1a1a;
    }

    /* Customer Release block */
    .cover-release-block {
      margin-top: 4mm;
    }

    .cover-release-block .release-line {
      font-size: 9pt;
      padding: 1mm 0;
    }

    /* Revision history table */
    .revision-history {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5mm;
    }

    .revision-history th,
    .revision-history td {
      border: 0.4pt solid #000;
      padding: 1.5mm 2mm;
      font-size: 8.5pt;
      vertical-align: top;
      height: 7mm;
    }

    .revision-history th {
      background: #f5f5f5;
      font-weight: bold;
      text-align: left;
    }

    .revision-history th.col-idx,
    .revision-history td.col-idx {
      width: 14%;
    }

    .revision-history th.col-date,
    .revision-history td.col-date {
      width: 18%;
    }

    .revision-history th.col-name,
    .revision-history td.col-name {
      width: 22%;
    }

    /* ============================================================ */
    /* CONTENT BLOCKS */
    /* ============================================================ */

    /* ---- Section header ---- */
    .section-header {
      font-size: 11pt;
      font-weight: bold;
      color: #1a1a1a;
      margin: 4mm 0 2.5mm 0;
      display: flex;
      gap: 4mm;
    }

    .section-header .sec-num {
      min-width: 8mm;
    }

    /* ---- Subsection header ---- */
    .subsection-header {
      font-size: 10pt;
      font-weight: bold;
      color: #1a1a1a;
      margin: 3mm 0 2mm 0;
      display: flex;
      gap: 4mm;
    }

    .subsection-header .sec-num {
      min-width: 10mm;
    }

    /* ---- Key-Value table ---- */
    /* Compact, no horizontal borders between rows, matches PoC */
    .kv-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1mm 0 3mm 0;
      margin-left: 8mm;
      width: calc(100% - 8mm);
    }

    .kv-table td {
      padding: 0.8mm 2mm;
      font-size: 9pt;
      vertical-align: top;
      line-height: 1.35;
    }

    .kv-table .kv-label {
      width: 48%;
      color: #1a1a1a;
    }

    .kv-table .kv-value {
      color: #1a1a1a;
    }

    /* ---- Data table ---- */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 3mm 0;
    }

    .data-table th {
      padding: 1.8mm 3mm;
      font-size: 8.5pt;
      font-weight: bold;
      text-align: left;
      background: #f5f5f5;
      border: 0.4pt solid #999;
      color: #1a1a1a;
    }

    .data-table td {
      padding: 1.5mm 3mm;
      font-size: 9pt;
      border: 0.4pt solid #bbb;
      vertical-align: top;
    }

    /* ---- Image block ---- */
    /* Full-width by default, no fixed max-height so images can be large */
    .image-block {
      margin: 3mm 0 3mm 0;
      text-align: center;
      page-break-inside: avoid;
    }

    .image-block img {
      max-width: 100%;
      height: auto;
      display: inline-block;
    }

    .image-block .caption {
      font-size: 8pt;
      color: #555;
      margin-top: 2mm;
      font-style: italic;
    }

    /* ---- Text block ---- */
    .text-block {
      margin: 2mm 0 2mm 0;
      font-size: 9pt;
      line-height: 1.45;
    }

    .text-block p {
      margin: 0 0 1.5mm 0;
    }

    .text-block p:last-child {
      margin-bottom: 0;
    }

    /* ---- Protective functions table ---- */
    .protective-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 3mm 0;
    }

    .protective-table th {
      padding: 1.8mm 3mm;
      font-size: 8.5pt;
      font-weight: bold;
      text-align: left;
      background: #f5f5f5;
      border: 0.4pt solid #999;
      color: #1a1a1a;
    }

    .protective-table td {
      padding: 1.5mm 3mm;
      font-size: 9pt;
      border: 0.4pt solid #bbb;
    }

    /* ---- General indices ---- */
    .indices-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0 3mm 0;
    }

    .indices-table td {
      padding: 1.2mm 2mm;
      font-size: 9pt;
      vertical-align: top;
      line-height: 1.4;
    }

    .indices-table .clause-id {
      width: 10%;
      font-weight: bold;
      color: #1a1a1a;
    }

    .indices-table .clause-text {
      color: #1a1a1a;
    }

    /* ---- Warnings block ---- */
    .warnings-block {
      margin: 3mm 0 3mm 0;
      padding: 3mm 4mm;
      border: 0.5pt solid #cc0000;
      background: #fff5f5;
    }

    .warnings-block p {
      font-size: 9pt;
      color: #cc0000;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    /* ---- Test conditions prefix text ---- */
    .tc-prefix {
      font-size: 9pt;
      line-height: 1.4;
      margin-bottom: 1mm;
      margin-left: 8mm;
      color: #1a1a1a;
    }
  `
}

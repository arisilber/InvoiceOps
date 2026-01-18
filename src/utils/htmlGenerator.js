/**
 * Formats cents to dollar amount
 */
const formatCurrency = (cents) => {
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Formats minutes to quantity (hours as decimal)
 */
const formatQuantity = (minutes) => {
  const hours = minutes / 60;
  return hours.toFixed(2);
};

/**
 * Generates HTML invoice content
 * @param {Object} invoice - The invoice object with lines and client info
 * @returns {string} The generated HTML string
 */
export const generateInvoiceHTML = (invoice) => {
  const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString();
  const dueDate = new Date(invoice.due_date).toLocaleDateString();
  const serviceStartDate = invoice.earliest_work_date ? new Date(invoice.earliest_work_date).toLocaleDateString() : null;
  const serviceEndDate = invoice.latest_work_date ? new Date(invoice.latest_work_date).toLocaleDateString() : null;
  
  const tableRows = invoice.lines?.map(line => {
    // Short description for the first column (work type and project only)
    const header = line.work_type_description || line.work_type_code || 'Work';
    const projectPart = line.project_name ? ` - ${escapeHtml(line.project_name)}` : '';
    const shortDescription = `${escapeHtml(header)}${projectPart}`;
    
    // Long description for the full-width row underneath
    let longDescription = '';
    if (line.description) {
      // Trim leading/trailing whitespace, then preserve spaces within the text
      // Trim again after preserveSpaces to ensure no leading/trailing spaces
      const trimmedDescription = String(line.description).trim();
      const preservedDescription = preserveSpaces(trimmedDescription);
      longDescription = escapeHtml(preservedDescription.trim());
    }
    
    const discount_percent = invoice.discount_percent || 0;
    
    // Main row with item details
    const mainRow = `
      <tr>
        <td style="white-space: pre-wrap; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; letter-spacing: normal;">${shortDescription}</td>
        <td style="text-align: center;">${formatQuantity(line.total_minutes)}</td>
        <td style="text-align: right;">${formatCurrency(line.hourly_rate_cents)}</td>
        <td style="text-align: right; color: #22c55e;">${discount_percent > 0 ? discount_percent + '%' : '0%'}</td>
        <td style="text-align: right;">${formatCurrency(line.amount_cents)}</td>
      </tr>
    `;
    
    // Description row (only if there's a long description)
    const descriptionRow = longDescription ? `
      <tr style="background: #f9fafb;">
        <td colspan="5" style="padding: 0.75rem 1rem; color: #6b7280; font-size: 0.75em; white-space: pre-wrap; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; letter-spacing: normal; border-top: none;"><em>${longDescription}</em></td>
      </tr>
    ` : '';
    
    return mainRow + descriptionRow;
  }).join('') || '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice INV-${invoice.invoice_number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    .invoice-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      border: 1px solid #d1d5db;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #d1d5db;
    }
    .invoice-title {
      font-size: 1.875rem;
      font-weight: 600;
      color: #1a1a1a;
      letter-spacing: -0.01em;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta p {
      margin: 0.25rem 0;
      color: #374151;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .invoice-meta strong {
      color: #1a1a1a;
      font-weight: 500;
    }
    .invoice-top-row {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
      align-items: flex-start;
    }
    .invoice-total-section {
      background: #ffffff;
      padding: 1.25rem 1.75rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .invoice-total-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.4;
    }
    .invoice-total-amount {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a1a;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
    }
    .client-info {
      flex: 1;
      padding: 1.25rem 1.75rem;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .client-info-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      font-size: 0.9375rem;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .client-info-label {
      font-weight: 500;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.8125rem;
    }
    .client-info-name {
      font-weight: 500;
      color: #1a1a1a;
    }
    .client-info-email {
      color: #6b7280;
      margin-left: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      border: 1px solid #d1d5db;
    }
    thead {
      background: #f9fafb;
      color: #1a1a1a;
      border-bottom: 2px solid #1a1a1a;
    }
    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 500;
      font-size: 0.75rem;
      vertical-align: top;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-right: 1px solid #e5e7eb;
      color: #374151;
    }
    th:last-child {
      border-right: none;
    }
    th:nth-child(2) {
      text-align: center;
    }
    th:nth-child(3),
    th:nth-child(4),
    th:nth-child(5) {
      text-align: right;
    }
    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    td {
      padding: 0.875rem 1rem;
      color: #1a1a1a;
      white-space: pre-wrap;
      word-wrap: break-word;
      letter-spacing: normal;
      font-kerning: normal;
      vertical-align: top;
      font-size: 0.9375rem;
      line-height: 1.5;
      border-right: 1px solid #e5e7eb;
    }
    td:last-child {
      border-right: none;
    }
    td:first-child {
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      font-weight: 400;
    }
    td:nth-child(3),
    td:nth-child(4),
    td:nth-child(5) {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    td:nth-child(2) {
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    .totals {
      margin-top: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 320px;
      border: 1px solid #d1d5db;
    }
    .totals-table td {
      padding: 0.625rem 1rem;
      border: none;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9375rem;
    }
    .totals-table tr:last-child td {
      border-bottom: none;
    }
    .totals-table tr {
      background: transparent;
      border: none;
    }
    .totals-table td:first-child {
      text-align: right;
      font-weight: 400;
      color: #374151;
      padding-right: 1.5rem;
    }
    .totals-table td:last-child {
      text-align: right;
      font-weight: 500;
      color: #1a1a1a;
      font-variant-numeric: tabular-nums;
      font-size: 0.9375rem;
    }
    .total-row td {
      font-size: 1rem;
      padding-top: 0.875rem;
      padding-bottom: 0.875rem;
      border-top: 1px solid #1a1a1a;
      font-weight: 600;
    }
    .total-row td:first-child {
      font-size: 0.8125rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1a1a1a;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        padding: 3rem;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <div>
        ${invoice.company_name ? `<div style="font-size: 1.125rem; font-weight: 600; color: #1a1a1a; margin-bottom: 0.5rem;">${escapeHtml(invoice.company_name)}</div>` : ''}
        ${invoice.company_address ? `<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem; white-space: pre-line;">${escapeHtml(invoice.company_address)}</div>` : ''}
        ${invoice.company_email ? `<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">${escapeHtml(invoice.company_email)}</div>` : ''}
        <h1 class="invoice-title" style="margin-top: 0;">INVOICE</h1>
      </div>
      <div class="invoice-meta">
        <p><strong>Invoice #:</strong> INV-${invoice.invoice_number}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
        ${serviceStartDate && serviceEndDate ? `<p><strong>Service Period:</strong> ${serviceStartDate} - ${serviceEndDate}</p>` : ''}
      </div>
    </div>

    <div class="invoice-top-row">
      <div class="invoice-total-section">
        <div class="invoice-total-label">TOTAL AMOUNT DUE</div>
        <div class="invoice-total-amount">${formatCurrency(invoice.total_cents)}</div>
      </div>

      <div class="client-info">
        <div class="client-info-label">Bill To:</div>
        <div class="client-info-row">
          <span class="client-info-name">${escapeHtml(invoice.client_name || 'N/A')}</span>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Discount</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td>${formatCurrency(invoice.subtotal_cents || invoice.total_cents)}</td>
        </tr>
        ${invoice.discount_cents > 0 ? `
        <tr>
          <td>Discount (${invoice.discount_percent || 0}%):</td>
          <td style="color: #dc2626;">-${formatCurrency(invoice.discount_cents)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>Total:</td>
          <td>${formatCurrency(invoice.total_cents)}</td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>
  `;

  return html.trim();
};

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Preserves spaces in text by replacing multiple spaces with a pattern
 * that HTML will render correctly while still allowing word wrapping
 * @param {string} text - Text to preserve spaces in
 * @returns {string} Text with preserved spaces
 */
const preserveSpaces = (text) => {
  if (!text) return '';
  // Replace 2+ consecutive spaces with: space + non-breaking space(s)
  // This preserves visual spacing while allowing wrapping
  return String(text).replace(/ {2,}/g, (match) => {
    // For 2 spaces: regular space + non-breaking space
    // For 3+ spaces: regular space + multiple non-breaking spaces
    return ' ' + '\u00A0'.repeat(match.length - 1);
  });
};

/**
 * Downloads the invoice as an HTML file
 * @param {Object} invoice - The invoice object with lines and client info
 */
export const downloadInvoiceHTML = (invoice) => {
  const html = generateInvoiceHTML(invoice);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${invoice.invoice_number}-${invoice.client_name?.replace(/\s+/g, '-') || 'invoice'}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads the invoice as a PDF by converting HTML to PDF
 * @param {Object} invoice - The invoice object with lines and client info
 */
export const downloadInvoiceHTMLAsPDF = async (invoice) => {
  // Import jsPDF using the same pattern as pdfGenerator.js
  const { jsPDF } = await import('jspdf');
  
  // Import html2canvas
  const html2canvasModule = await import('html2canvas').catch(() => null);
  const html2canvas = html2canvasModule?.default || html2canvasModule || window?.html2canvas;
  
  if (!html2canvas) {
    throw new Error('html2canvas is not available. Please ensure html2canvas is installed.');
  }
  
  const html = generateInvoiceHTML(invoice);
  
  // Create a blob URL for the HTML
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Create a temporary iframe to render the HTML with all styles
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '900px';
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.src = blobUrl;
  
  document.body.appendChild(iframe);
  
  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const iframeWindow = iframe.contentWindow;
        
        // Wait for fonts and styles to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ensure all images and fonts are loaded
        const images = iframeDoc.querySelectorAll('img');
        await Promise.all(Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
            setTimeout(resolve, 2000); // Timeout after 2s
          });
        }));
        
        // Get the invoice container element
        const invoiceContainer = iframeDoc.querySelector('.invoice-container');
        if (!invoiceContainer) {
          throw new Error('Invoice container not found');
        }
        
        // Use html2canvas directly for better style rendering
        // Ensure whitespace is preserved in the cloned document
        const canvas = await html2canvas(invoiceContainer, {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          windowWidth: 900,
          windowHeight: invoiceContainer.scrollHeight,
          width: invoiceContainer.scrollWidth,
          height: invoiceContainer.scrollHeight,
          onclone: (clonedDoc) => {
            // Ensure all table cells preserve whitespace
            const cells = clonedDoc.querySelectorAll('td');
            cells.forEach(cell => {
              // Force whitespace preservation
              cell.style.whiteSpace = 'pre-wrap';
              cell.style.wordWrap = 'break-word';
              // Ensure computed style is applied
              const computedStyle = clonedDoc.defaultView.getComputedStyle(cell);
              if (computedStyle.whiteSpace !== 'pre-wrap') {
                cell.setAttribute('style', 
                  (cell.getAttribute('style') || '') + '; white-space: pre-wrap !important; word-wrap: break-word !important;'
                );
              }
            });
          }
        });
        
        // Convert canvas to PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate dimensions to fit the canvas in the PDF
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
        const finalWidth = imgWidth * 0.264583 * ratio;
        const finalHeight = imgHeight * 0.264583 * ratio;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
        
        const filename = `Invoice-${invoice.invoice_number}-${invoice.client_name?.replace(/\s+/g, '-') || 'invoice'}.pdf`;
        pdf.save(filename);
        
        // Cleanup
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
        resolve();
      } catch (error) {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
        reject(error);
      }
    };
    
    iframe.onerror = () => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load HTML in iframe'));
    };
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
        reject(new Error('PDF generation timeout'));
      }
    }, 15000);
  });
};

/**
 * Gets the HTML as a blob URL for preview
 * @param {Object} invoice - The invoice object with lines and client info
 * @returns {string} Blob URL of the HTML
 */
export const getInvoiceHTMLBlobURL = (invoice) => {
  const html = generateInvoiceHTML(invoice);
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
};


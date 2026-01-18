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
  
  const tableRows = invoice.lines?.map(line => {
    // Use AI-generated description if available, otherwise fallback to constructed description
    let description;
    if (line.description) {
      // Format with work type and project as header, AI description as body
      const header = line.work_type_description || line.work_type_code || 'Work';
      const projectPart = line.project_name ? ` - ${line.project_name}` : '';
      // Preserve spaces in the description text
      const preservedDescription = preserveSpaces(line.description);
      description = `<strong>${escapeHtml(header + projectPart)}</strong><br/><em style="font-size: 0.9em; color: #6b7280;">${escapeHtml(preservedDescription)}</em>`;
    } else {
      // Fallback to constructed description
      description = line.project_name 
        ? `${escapeHtml(line.work_type_description || line.work_type_code || 'Work')} - ${escapeHtml(line.project_name)}`
        : escapeHtml(line.work_type_description || line.work_type_code || 'Work');
    }
    
    const discount_percent = invoice.discount_percent || 0;
    
    return `
      <tr>
        <td style="white-space: pre-wrap; word-wrap: break-word;">${description}</td>
        <td style="text-align: center;">${formatQuantity(line.total_minutes)}</td>
        <td style="text-align: right;">${formatCurrency(line.hourly_rate_cents)}</td>
        <td style="text-align: right; color: #22c55e;">${discount_percent > 0 ? discount_percent + '%' : '0%'}</td>
        <td style="text-align: right;">${formatCurrency(line.amount_cents)}</td>
      </tr>
    `;
  }).join('') || '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice INV-${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }
    .invoice-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #000000;
    }
    .invoice-title {
      font-size: 2.5rem;
      font-weight: bold;
      color: #1f2937;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta p {
      margin: 0.25rem 0;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .invoice-meta strong {
      color: #1f2937;
    }
    .client-info {
      margin-bottom: 2rem;
    }
    .client-info h3 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      color: #1f2937;
    }
    .client-info p {
      color: #6b7280;
      margin: 0.25rem 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
    }
    thead {
      background: #000000;
      color: white;
    }
    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      vertical-align: top;
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
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    tbody tr:hover {
      background: #f3f4f6;
    }
    td {
      padding: 1rem;
      color: #374151;
      white-space: pre-wrap;
      word-wrap: break-word;
      vertical-align: top;
    }
    .totals {
      margin-top: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 300px;
    }
    .totals-table td {
      padding: 0.5rem 1rem;
      border: none;
    }
    .totals-table tr {
      background: transparent;
      border: none;
    }
    .totals-table tr:hover {
      background: transparent;
    }
    .totals-table td:first-child {
      text-align: right;
      font-weight: normal;
      color: #6b7280;
    }
    .totals-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }
    .total-row td {
      font-size: 1.2rem;
      padding-top: 1rem;
      border-top: 2px solid #000000;
    }
    .status {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .status strong {
      color: #1f2937;
      text-transform: uppercase;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
        padding: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <h1 class="invoice-title">INVOICE</h1>
      <div class="invoice-meta">
        <p><strong>Invoice #:</strong> INV-${invoice.invoice_number}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
      </div>
    </div>

    <div class="client-info">
      <h3>Bill To:</h3>
      <p><strong>${escapeHtml(invoice.client_name || 'N/A')}</strong></p>
      ${invoice.client_email ? `<p>${escapeHtml(invoice.client_email)}</p>` : ''}
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
        <tr class="total-row">
          <td>Total:</td>
          <td>${formatCurrency(invoice.total_cents)}</td>
        </tr>
      </table>
    </div>

    ${invoice.status ? `
      <div class="status">
        <strong>Status:</strong> ${invoice.status.toUpperCase()}
      </div>
    ` : ''}
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


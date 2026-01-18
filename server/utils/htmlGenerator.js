/**
 * Server-side HTML generator for invoices
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
 * Escapes HTML special characters
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
 */
const preserveSpaces = (text) => {
  if (!text) return '';
  // Replace 2+ consecutive spaces with: space + non-breaking space(s)
  return String(text).replace(/ {2,}/g, (match) => {
    return ' ' + '\u00A0'.repeat(match.length - 1);
  });
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
        <td style="white-space: pre-wrap; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; letter-spacing: normal;">${description}</td>
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
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
      letter-spacing: normal;
      font-kerning: normal;
      vertical-align: top;
    }
    td:first-child {
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
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

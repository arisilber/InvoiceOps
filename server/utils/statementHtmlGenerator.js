/**
 * Formats cents to dollar amount
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted currency string
 */
const formatCurrency = (cents) => {
  const amount = cents / 100;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formats a date string to readable format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date (e.g., "Jan 15, 2024")
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // Accept either "YYYY-MM-DD" or an ISO timestamp like "YYYY-MM-DDTHH:mm:ss.sssZ"
  const normalized = String(dateStr);
  const date = normalized.includes('T') ? new Date(normalized) : new Date(normalized + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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
 * Generates HTML statement content
 * @param {Object} statement - The statement object from statementService.calculateStatement()
 * @returns {string} The generated HTML string
 */
export const generateStatementHTML = (statement) => {
  const startDateFormatted = formatDate(statement.start_date);
  const endDateFormatted = formatDate(statement.end_date);
  
  // Generate transaction rows
  const transactionRows = statement.transactions?.map(transaction => {
    const isPayment = transaction.type === 'payment';
    const amountClass = isPayment ? 'payment-amount' : 'invoice-amount';
    
    return `
      <tr class="transaction-row ${transaction.type}-row">
        <td class="date-cell">${formatDate(transaction.date)}</td>
        <td class="type-cell">${isPayment ? 'Payment' : 'Invoice'}</td>
        <td class="document-cell">${escapeHtml(transaction.document_number)}</td>
        <td class="description-cell">${escapeHtml(transaction.description)}</td>
        <td class="amount-cell ${amountClass}">${formatCurrency(transaction.amount_cents)}</td>
        <td class="balance-cell">${formatCurrency(transaction.running_balance_cents)}</td>
      </tr>
    `;
  }).join('') || '';

  // If no transactions, show a message row
  const noTransactionsRow = statement.transactions?.length === 0 ? `
    <tr>
      <td colspan="6" class="no-transactions">No transactions during this period</td>
    </tr>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Statement - ${escapeHtml(statement.client_name)} - ${statement.start_date} to ${statement.end_date}</title>
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
    .statement-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      border: 1px solid #d1d5db;
    }
    .statement-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #d1d5db;
    }
    .company-info {
      flex: 1;
    }
    .company-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }
    .company-address {
      font-size: 0.875rem;
      color: #6b7280;
      white-space: pre-line;
      margin-bottom: 0.25rem;
    }
    .company-email {
      font-size: 0.875rem;
      color: #6b7280;
    }
    .statement-meta {
      text-align: right;
    }
    .statement-title {
      font-size: 1.875rem;
      font-weight: 600;
      color: #1a1a1a;
      letter-spacing: -0.01em;
      margin: 0 0 0.75rem 0;
    }
    .statement-meta p {
      margin: 0.25rem 0;
      color: #374151;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .statement-meta strong {
      color: #1a1a1a;
      font-weight: 500;
    }
    .info-section {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .client-info {
      flex: 1;
      padding: 1.25rem 1.75rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    .info-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .client-name {
      font-weight: 500;
      color: #1a1a1a;
      font-size: 1rem;
    }
    .client-email {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .balance-summary {
      flex: 1;
      padding: 1.25rem 1.75rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0;
      font-size: 0.9375rem;
    }
    .balance-row.ending {
      border-top: 2px solid #1a1a1a;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      font-weight: 600;
    }
    .balance-label {
      color: #4b5563;
    }
    .balance-value {
      color: #1a1a1a;
      font-variant-numeric: tabular-nums;
    }
    .balance-row.ending .balance-label,
    .balance-row.ending .balance-value {
      color: #1a1a1a;
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
    th.amount-header,
    th.balance-header {
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
      padding: 0.75rem 1rem;
      color: #1a1a1a;
      vertical-align: top;
      font-size: 0.875rem;
      line-height: 1.5;
      border-right: 1px solid #e5e7eb;
    }
    td:last-child {
      border-right: none;
    }
    .date-cell {
      white-space: nowrap;
      width: 100px;
    }
    .type-cell {
      width: 70px;
    }
    .document-cell {
      width: 100px;
      font-family: monospace;
      font-size: 0.8125rem;
    }
    .description-cell {
      min-width: 200px;
    }
    .amount-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
      width: 110px;
    }
    .balance-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      width: 110px;
    }
    .invoice-amount {
      color: #1a1a1a;
    }
    .payment-amount {
      color: #16a34a;
    }
    .invoice-row {
      background: #ffffff;
    }
    .payment-row {
      background: #f0fdf4;
    }
    tbody tr.payment-row:nth-child(even) {
      background: #ecfdf5;
    }
    .beginning-balance-row {
      background: #fef3c7;
      border-bottom: 2px solid #d1d5db;
    }
    .beginning-balance-row td {
      font-weight: 500;
      color: #92400e;
    }
    .no-transactions {
      text-align: center;
      color: #6b7280;
      font-style: italic;
      padding: 2rem;
    }
    .totals-section {
      margin-top: 2rem;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 320px;
      border: 1px solid #d1d5db;
      border-collapse: collapse;
    }
    .totals-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-table tr:last-child {
      border-bottom: none;
    }
    .totals-table td {
      padding: 0.625rem 1rem;
      border: none;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .totals-table td:first-child {
      text-align: left;
      font-weight: 400;
      color: #4b5563;
    }
    .totals-table td:last-child {
      text-align: right;
      font-weight: 500;
      color: #1a1a1a;
      font-variant-numeric: tabular-nums;
    }
    .totals-table .total-row {
      background: #f9fafb;
      border-top: 2px solid #1a1a1a;
    }
    .totals-table .total-row td {
      font-weight: 600;
      padding-top: 0.875rem;
      padding-bottom: 0.875rem;
    }
    .totals-table .total-row td:first-child {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.75rem;
      color: #1a1a1a;
    }
    .totals-table .total-row td:last-child {
      font-size: 1rem;
    }
    /* Page break handling for multi-page statements */
    @page {
      size: A4;
      margin: 5mm;
    }
    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;
      }
      .statement-container {
        box-shadow: none;
        padding: 3rem;
        margin: 0;
        max-width: 100%;
        border: none;
      }
      .statement-header {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .info-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      thead {
        display: table-header-group;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      tbody tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .totals-section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="statement-container">
    <div class="statement-header">
      <div class="company-info">
        ${statement.company_name ? `<div class="company-name">${escapeHtml(statement.company_name)}</div>` : ''}
        ${statement.company_address ? `<div class="company-address">${escapeHtml(statement.company_address)}</div>` : ''}
        ${statement.company_email ? `<div class="company-email">${escapeHtml(statement.company_email)}</div>` : ''}
      </div>
      <div class="statement-meta">
        <h2 class="statement-title">STATEMENT</h2>
        <p><strong>Period:</strong> ${startDateFormatted} – ${endDateFormatted}</p>
        <p><strong>Generated:</strong> ${formatDate(new Date().toISOString().split('T')[0])}</p>
      </div>
    </div>

    <div class="info-section">
      <div class="client-info">
        <div class="info-label">Customer</div>
        <div class="client-name">${escapeHtml(statement.client_name || 'N/A')}</div>
        ${statement.client_email ? `<div class="client-email">${escapeHtml(statement.client_email)}</div>` : ''}
      </div>

      <div class="balance-summary">
        <div class="info-label">Account Summary</div>
        <div class="balance-row">
          <span class="balance-label">Beginning Balance:</span>
          <span class="balance-value">${formatCurrency(statement.beginning_balance_cents)}</span>
        </div>
        <div class="balance-row">
          <span class="balance-label">Invoices:</span>
          <span class="balance-value">+ ${formatCurrency(statement.period_invoices_total_cents)}</span>
        </div>
        <div class="balance-row">
          <span class="balance-label">Payments:</span>
          <span class="balance-value">- ${formatCurrency(statement.period_payments_total_cents)}</span>
        </div>
        <div class="balance-row ending">
          <span class="balance-label">Ending Balance:</span>
          <span class="balance-value">${formatCurrency(statement.ending_balance_cents)}</span>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Document</th>
          <th>Description</th>
          <th class="amount-header">Amount</th>
          <th class="balance-header">Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr class="beginning-balance-row">
          <td>${startDateFormatted}</td>
          <td>—</td>
          <td>—</td>
          <td>Beginning Balance</td>
          <td class="amount-cell">—</td>
          <td class="balance-cell">${formatCurrency(statement.beginning_balance_cents)}</td>
        </tr>
        ${transactionRows}
        ${noTransactionsRow}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td>Beginning Balance</td>
          <td>${formatCurrency(statement.beginning_balance_cents)}</td>
        </tr>
        <tr>
          <td>Period Invoices</td>
          <td>${formatCurrency(statement.period_invoices_total_cents)}</td>
        </tr>
        <tr>
          <td>Period Payments</td>
          <td>-${formatCurrency(statement.period_payments_total_cents)}</td>
        </tr>
        <tr class="total-row">
          <td>Ending Balance</td>
          <td>${formatCurrency(statement.ending_balance_cents)}</td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>
  `;

  return html.trim();
};

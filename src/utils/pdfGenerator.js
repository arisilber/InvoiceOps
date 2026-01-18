import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Formats cents to dollar amount
 */
const formatCurrency = (cents) => {
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Formats minutes to hours and minutes
 */
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Generates a PDF from invoice data
 * @param {Object} invoice - The invoice object with lines and client info
 * @returns {jsPDF} The generated PDF document
 */
export const generateInvoicePDF = (invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, yPosition);
  yPosition += 10;

  // Invoice number and dates
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: INV-${invoice.invoice_number}`, pageWidth - margin, yPosition - 10, { align: 'right' });
  yPosition += 5;
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 5;
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 15;

  // Client information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, yPosition);
  yPosition += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.client_name || 'N/A', margin, yPosition);
  yPosition += 5;
  if (invoice.client_email) {
    doc.text(invoice.client_email, margin, yPosition);
    yPosition += 5;
  }
  yPosition += 10;

  // Invoice lines table
  const tableData = invoice.lines?.map(line => {
    const description = line.project_name 
      ? `${line.work_type_description || line.work_type_code || 'Work'} - ${line.project_name}`
      : (line.work_type_description || line.work_type_code || 'Work');
    
    const discount_percent = invoice.discount_percent || 0;
    
    return [
      description,
      formatTime(line.total_minutes),
      formatCurrency(line.hourly_rate_cents),
      discount_percent > 0 ? `${discount_percent}%` : '0%',
      formatCurrency(line.amount_cents)
    ];
  }) || [];

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Time', 'Rate', 'Discount', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 0, 0], // Black
      textColor: 255, // White text
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0] // Black text
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240] // Light gray for alternating rows
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 },
      4: { halign: 'right', cellWidth: 40 }
    },
    margin: { left: margin, right: margin },
    styles: {
      cellPadding: 5
    }
  });

  // Get the final Y position after the table
  // autoTable attaches lastAutoTable to the doc object
  yPosition = (doc.lastAutoTable?.finalY || doc.internal.pageSize.height - 50) + 15;

  // Totals
  const totalsX = pageWidth - margin - 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX, yPosition, { align: 'right' });
  doc.text(formatCurrency(invoice.total_cents), pageWidth - margin, yPosition);
  yPosition += 10;

  // Status
  if (invoice.status) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, margin, yPosition);
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc;
};

/**
 * Downloads the invoice as a PDF file
 * @param {Object} invoice - The invoice object with lines and client info
 */
export const downloadInvoicePDF = (invoice) => {
  const doc = generateInvoicePDF(invoice);
  const filename = `Invoice-${invoice.invoice_number}-${invoice.client_name?.replace(/\s+/g, '-') || 'invoice'}.pdf`;
  doc.save(filename);
};

/**
 * Gets the PDF as a data URL for preview
 * @param {Object} invoice - The invoice object with lines and client info
 * @returns {string} Data URL of the PDF
 */
export const getInvoicePDFDataURL = (invoice) => {
  const doc = generateInvoicePDF(invoice);
  return doc.output('dataurlstring');
};

/**
 * Gets the PDF as a blob URL for preview
 * @param {Object} invoice - The invoice object with lines and client info
 * @returns {string} Blob URL of the PDF
 */
export const getInvoicePDFBlobURL = (invoice) => {
  const doc = generateInvoicePDF(invoice);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
};


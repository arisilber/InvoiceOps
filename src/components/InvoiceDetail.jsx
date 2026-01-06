import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Loader2, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';
import InvoicePDFPreview from './InvoicePDFPreview';
import { downloadInvoiceHTMLAsPDF } from '../utils/htmlGenerator';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInvoice(id);
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (invoice) {
      try {
        await downloadInvoiceHTMLAsPDF(invoice);
      } catch (err) {
        console.error('Error downloading invoice:', err);
        setError('Failed to download invoice PDF');
      }
    }
  };

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '400px' }}>
        <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-4"
      >
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/invoices')}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={18} />
          Back to Invoices
        </button>
        <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/invoices')}
            style={{ 
              marginBottom: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem' 
            }}
          >
            <ArrowLeft size={18} />
            Back to Invoices
          </button>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
            Invoice INV-{invoice.invoice_number}
          </h2>
          <p style={{ opacity: 0.7 }}>
            {invoice.client_name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setIsPreviewOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileText size={18} />
            Preview
          </button>
          <button
            className="btn"
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
          {error}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Main Content */}
        <div className="flex flex-col gap-6">
          {/* Invoice Information */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Invoice Information</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem',
                  opacity: 0.7,
                  fontSize: '0.875rem'
                }}>
                  <Calendar size={16} />
                  Invoice Date
                </div>
                <div style={{ fontWeight: 600 }}>
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem',
                  opacity: 0.7,
                  fontSize: '0.875rem'
                }}>
                  <Calendar size={16} />
                  Due Date
                </div>
                <div style={{ fontWeight: 600 }}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem',
                  opacity: 0.7,
                  fontSize: '0.875rem'
                }}>
                  <User size={16} />
                  Client
                </div>
                <div style={{ fontWeight: 600 }}>
                  {invoice.client_name}
                </div>
                {invoice.client_email && (
                  <div style={{ fontSize: '0.875rem', opacity: 0.6, marginTop: '0.25rem' }}>
                    {invoice.client_email}
                  </div>
                )}
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem',
                  opacity: 0.7,
                  fontSize: '0.875rem'
                }}>
                  <FileText size={16} />
                  Status
                </div>
                <div>
                  <span className={`badge badge-${invoice.status}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Line Items</h3>
            </div>
            {invoice.lines && invoice.lines.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'center' }}>Time</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Rate</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, index) => {
                    const description = line.project_name 
                      ? `${line.work_type_description || line.work_type_code || 'Work'} - ${line.project_name}`
                      : (line.work_type_description || line.work_type_code || 'Work');
                    
                    return (
                      <tr 
                        key={line.id}
                        style={{
                          borderBottom: index !== invoice.lines.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '1rem 1.5rem' }}>{description}</td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                          {formatTime(line.total_minutes)}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                          {formatCurrency(line.hourly_rate_cents)}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(line.amount_cents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                No line items found
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Summary</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div style={{ opacity: 0.7 }}>Subtotal</div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                  {formatCurrency(invoice.subtotal_cents)}
                </div>
              </div>
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between items-center">
                  <div style={{ opacity: 0.7 }}>Discount</div>
                  <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                    -{formatCurrency(invoice.discount_cents)}
                  </div>
                </div>
              )}
              <div style={{ 
                height: '1px', 
                background: 'var(--border)', 
                margin: '0.5rem 0' 
              }} />
              <div className="flex justify-between items-center">
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>Total</div>
                <div style={{ 
                  fontWeight: 800, 
                  fontSize: '1.5rem',
                  color: 'var(--primary)'
                }}>
                  {formatCurrency(invoice.total_cents)}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Details</h3>
            <div className="flex flex-col gap-3">
              <div>
                <div style={{ opacity: 0.7, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Invoice Number
                </div>
                <div style={{ fontWeight: 600 }}>
                  INV-{invoice.invoice_number}
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.7, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Created
                </div>
                <div style={{ fontWeight: 600 }}>
                  {new Date(invoice.created_at).toLocaleDateString()}
                </div>
              </div>
              {invoice.updated_at && (
                <div>
                  <div style={{ opacity: 0.7, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    Last Updated
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(invoice.updated_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <InvoicePDFPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invoice={invoice}
      />
    </motion.div>
  );
};

export default InvoiceDetail;


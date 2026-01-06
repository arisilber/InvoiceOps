import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Loader2, Calendar, User, FileText, AlertCircle, Send, FileEdit } from 'lucide-react';
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
  const [markingAsSent, setMarkingAsSent] = useState(false);
  const [markingAsDraft, setMarkingAsDraft] = useState(false);

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

  const handleMarkAsSent = async () => {
    if (!invoice) return;
    
    try {
      setMarkingAsSent(true);
      const updatedInvoice = await api.markInvoiceAsSent(invoice.id);
      setInvoice({ ...invoice, status: 'sent' });
    } catch (err) {
      console.error('Error marking invoice as sent:', err);
      setError('Failed to mark invoice as sent. Please try again.');
    } finally {
      setMarkingAsSent(false);
    }
  };

  const handleMarkAsDraft = async () => {
    if (!invoice) return;
    
    try {
      setMarkingAsDraft(true);
      const updatedInvoice = await api.markInvoiceAsDraft(invoice.id);
      setInvoice({ ...invoice, status: 'draft' });
    } catch (err) {
      console.error('Error marking invoice as draft:', err);
      setError('Failed to mark invoice as draft. Please try again.');
    } finally {
      setMarkingAsDraft(false);
    }
  };

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatQuantity = (minutes) => {
    const hours = minutes / 60;
    return hours.toFixed(2);
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center" 
        style={{ 
          height: '400px',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem 2.5rem'
        }}
      >
        <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem 2.5rem',
          width: '100%'
        }}
      >
        <div className="flex flex-col gap-6">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/invoices')}
            style={{ alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            Back to Invoices
          </button>
          <div className="card" style={{ 
            borderColor: 'var(--error)', 
            color: 'var(--error-text)',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              {error}
            </div>
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
      className="invoice-detail-container"
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem 2.5rem',
        width: '100%'
      }}
    >
      <div className="flex flex-col gap-8" style={{ width: '100%' }}>
        {/* Header */}
        <div 
          className="flex justify-between items-start invoice-detail-header"
          style={{
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div style={{ flex: 1 }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/invoices')}
              style={{ 
                marginBottom: '1.5rem'
              }}
            >
              <ArrowLeft size={16} />
              Back to Invoices
            </button>
            <h2 style={{ 
              fontSize: '2.25rem', 
              marginBottom: '0.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em'
            }}>
              Invoice INV-{invoice.invoice_number}
            </h2>
            <p style={{ 
              opacity: 0.7,
              fontSize: '1.125rem',
              marginTop: '0.25rem'
            }}>
              {invoice.client_name}
            </p>
          </div>
          <div className="flex gap-3 invoice-detail-header-actions" style={{ marginLeft: '2rem' }}>
            {invoice.status === 'draft' && (
              <button
                className="btn"
                onClick={handleMarkAsSent}
                disabled={markingAsSent}
              >
                {markingAsSent ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Marking...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Mark as Sent
                  </>
                )}
              </button>
            )}
            {(invoice.status === 'sent' || invoice.status === 'partially_paid') && (
              <button
                className="btn btn-secondary"
                onClick={handleMarkAsDraft}
                disabled={markingAsDraft}
              >
                {markingAsDraft ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Marking...
                  </>
                ) : (
                  <>
                    <FileEdit size={16} />
                    Mark as Draft
                  </>
                )}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setIsPreviewOpen(true)}
            >
              <FileText size={16} />
              Preview
            </button>
            <button
              className="btn"
              onClick={handleDownload}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>

        {error && (
          <div 
            className="card" 
            style={{ 
              borderColor: 'var(--error)', 
              color: 'var(--error-text)',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        <div 
          className="grid invoice-detail-grid" 
          style={{ 
            gridTemplateColumns: '2fr 1fr', 
            gap: '2rem',
            alignItems: 'start'
          }}
        >
        {/* Main Content */}
        <div className="flex flex-col gap-6">
          {/* Invoice Information */}
          <div className="card invoice-detail-card" style={{ padding: '2rem' }}>
            <h3 style={{ 
              marginBottom: '2rem', 
              fontSize: '1.375rem',
              fontWeight: 700,
              letterSpacing: '-0.01em'
            }}>
              Invoice Information
            </h3>
            <div className="grid invoice-detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
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
            <div style={{ 
              padding: '2rem 2rem 1.5rem 2rem', 
              borderBottom: '1px solid var(--border)' 
            }}>
              <h3 style={{ 
                fontSize: '1.375rem',
                fontWeight: 700,
                letterSpacing: '-0.01em'
              }}>
                Line Items
              </h3>
            </div>
            {invoice.lines && invoice.lines.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ 
                        padding: '1.25rem 2rem', 
                        fontWeight: 600, 
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.7
                      }}>
                        Description
                      </th>
                      <th style={{ 
                        padding: '1.25rem 2rem', 
                        fontWeight: 600, 
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.7
                      }}>
                        Qty
                      </th>
                      <th style={{ 
                        padding: '1.25rem 2rem', 
                        fontWeight: 600, 
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.7
                      }}>
                        Rate
                      </th>
                      <th style={{ 
                        padding: '1.25rem 2rem', 
                        fontWeight: 600, 
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.7
                      }}>
                        Discount
                      </th>
                      <th style={{ 
                        padding: '1.25rem 2rem', 
                        fontWeight: 600, 
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.7
                      }}>
                        Amount
                      </th>
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
                          <td style={{ padding: '1.25rem 2rem' }}>{description}</td>
                          <td style={{ padding: '1.25rem 2rem', textAlign: 'center' }}>
                            {formatQuantity(line.total_minutes)}
                          </td>
                          <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                            {formatCurrency(line.hourly_rate_cents)}
                          </td>
                          <td style={{ padding: '1.25rem 2rem', textAlign: 'right', color: 'var(--secondary)' }}>
                            {line.discount_cents > 0 ? `-${formatCurrency(line.discount_cents)}` : formatCurrency(0)}
                          </td>
                          <td style={{ padding: '1.25rem 2rem', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(line.amount_cents)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', opacity: 0.5 }}>
                No line items found
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="flex flex-col gap-6 invoice-detail-sidebar" style={{ position: 'sticky', top: '2rem' }}>
          <div className="card invoice-detail-card" style={{ padding: '2rem' }}>
            <h3 style={{ 
              marginBottom: '2rem', 
              fontSize: '1.375rem',
              fontWeight: 700,
              letterSpacing: '-0.01em'
            }}>
              Summary
            </h3>
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div style={{ opacity: 0.7, fontSize: '0.9375rem' }}>Subtotal</div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                  {formatCurrency(invoice.subtotal_cents)}
                </div>
              </div>
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between items-center">
                  <div style={{ opacity: 0.7, fontSize: '0.9375rem' }}>Discount</div>
                  <div style={{ fontWeight: 600, color: 'var(--secondary)', fontSize: '1.125rem' }}>
                    -{formatCurrency(invoice.discount_cents)}
                  </div>
                </div>
              )}
              <div style={{ 
                height: '1px', 
                background: 'var(--border)', 
                margin: '0.75rem 0' 
              }} />
              <div className="flex justify-between items-center" style={{ paddingTop: '0.5rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>Total</div>
                <div style={{ 
                  fontWeight: 800, 
                  fontSize: '1.75rem',
                  color: 'var(--primary)'
                }}>
                  {formatCurrency(invoice.total_cents)}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="card invoice-detail-card" style={{ padding: '2rem' }}>
            <h3 style={{ 
              marginBottom: '2rem', 
              fontSize: '1.375rem',
              fontWeight: 700,
              letterSpacing: '-0.01em'
            }}>
              Details
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <div style={{ 
                  opacity: 0.7, 
                  fontSize: '0.875rem', 
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600
                }}>
                  Invoice Number
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                  INV-{invoice.invoice_number}
                </div>
              </div>
              <div>
                <div style={{ 
                  opacity: 0.7, 
                  fontSize: '0.875rem', 
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600
                }}>
                  Created
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {new Date(invoice.created_at).toLocaleDateString()}
                </div>
              </div>
              {invoice.updated_at && (
                <div>
                  <div style={{ 
                    opacity: 0.7, 
                    fontSize: '0.875rem', 
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600
                  }}>
                    Last Updated
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {new Date(invoice.updated_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
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


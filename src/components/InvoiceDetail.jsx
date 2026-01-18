import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Loader2, Calendar, User, FileText, AlertCircle, Send, FileEdit, Trash2, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import api from '../services/api';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAsSent, setMarkingAsSent] = useState(false);
  const [markingAsDraft, setMarkingAsDraft] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

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
        await api.downloadInvoicePDF(invoice.id);
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

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoice) return;

    try {
      setDeleting(true);
      await api.deleteInvoice(invoice.id);
      navigate('/invoices');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError('Failed to delete invoice. Please try again.');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
  };

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatQuantity = (minutes) => {
    const hours = minutes / 60;
    return hours.toFixed(2);
  };

  const handleEditDescription = (line) => {
    setEditingLineId(line.id);
    setEditingDescription(line.description || '');
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditingDescription('');
  };

  const handleSaveDescription = async (lineId) => {
    try {
      setSavingDescription(true);
      await api.updateInvoiceLineDescription(lineId, editingDescription);
      
      // Update the invoice state
      setInvoice(prev => ({
        ...prev,
        lines: prev.lines.map(line => 
          line.id === lineId 
            ? { ...line, description: editingDescription || null }
            : line
        )
      }));
      
      setEditingLineId(null);
      setEditingDescription('');
    } catch (err) {
      console.error('Error updating description:', err);
      setError('Failed to update description. Please try again.');
    } finally {
      setSavingDescription(false);
    }
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
        padding: '1.5rem 2rem',
        width: '100%'
      }}
    >
      <div className="flex flex-col" style={{ width: '100%', gap: '1.5rem' }}>
        {/* Header */}
        <div 
          className="flex justify-between items-start invoice-detail-header"
          style={{
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div style={{ flex: 1 }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/invoices')}
              style={{ 
                marginBottom: '1rem'
              }}
            >
              <ArrowLeft size={16} />
              Back to Invoices
            </button>
            <h2 style={{ 
              fontSize: '1.875rem', 
              marginBottom: '0.375rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--foreground)'
            }}>
              Invoice INV-{invoice.invoice_number}
            </h2>
            <p style={{ 
              opacity: 0.65,
              fontSize: '0.9375rem',
              marginTop: 0
            }}>
              {invoice.client_name}
            </p>
          </div>
          <div className="flex invoice-detail-header-actions" style={{ marginLeft: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            {invoice.status === 'draft' && (
              <button
                onClick={handleMarkAsSent}
                disabled={markingAsSent}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: 'var(--foreground)',
                  color: 'var(--background)',
                  cursor: markingAsSent ? 'not-allowed' : 'pointer',
                  opacity: markingAsSent ? 0.6 : 1,
                  transition: 'opacity 0.15s ease',
                  fontFamily: 'var(--font-sans)',
                  gap: '0.5rem',
                  lineHeight: 1.2,
                  minHeight: '36px'
                }}
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
                onClick={handleMarkAsDraft}
                disabled={markingAsDraft}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  cursor: markingAsDraft ? 'not-allowed' : 'pointer',
                  opacity: markingAsDraft ? 0.6 : 1,
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'var(--font-sans)',
                  gap: '0.5rem',
                  lineHeight: 1.2,
                  minHeight: '36px'
                }}
                onMouseEnter={(e) => !markingAsDraft && (e.currentTarget.style.backgroundColor = 'var(--border)')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
              onClick={() => navigate(`/invoices/${invoice.id}/view`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--foreground)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                fontFamily: 'var(--font-sans)',
                gap: '0.5rem',
                lineHeight: 1.2,
                minHeight: '36px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FileText size={16} />
              Preview
            </button>
            <button
              onClick={handleDownload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: 'none',
                background: 'var(--foreground)',
                color: 'var(--background)',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
                fontFamily: 'var(--font-sans)',
                gap: '0.5rem',
                lineHeight: 1.2,
                minHeight: '36px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={handleDeleteClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: '1px solid #ef4444',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                fontFamily: 'var(--font-sans)',
                gap: '0.5rem',
                lineHeight: 1.2,
                minHeight: '36px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        {error && (
          <div 
            className="card" 
            style={{ 
              borderColor: 'var(--error)', 
              color: 'var(--error-text)',
              padding: '1rem 1.25rem'
            }}
          >
            {error}
          </div>
        )}

        <div 
          className="grid invoice-detail-grid" 
          style={{ 
            gridTemplateColumns: '2fr 1fr', 
            gap: '1.5rem',
            alignItems: 'start'
          }}
        >
        {/* Main Content */}
        <div className="flex flex-col" style={{ gap: '1.25rem' }}>
          {/* Invoice Information */}
          <div className="card invoice-detail-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ 
              marginBottom: '1.25rem', 
              fontSize: '1.125rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--foreground)'
            }}>
              Invoice Information
            </h3>
            <div className="grid invoice-detail-info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem 2rem' }}>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem', 
                  marginBottom: '0.375rem',
                  opacity: 0.65,
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 500
                }}>
                  <Calendar size={14} />
                  Invoice Date
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem', 
                  marginBottom: '0.375rem',
                  opacity: 0.65,
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 500
                }}>
                  <Calendar size={14} />
                  Due Date
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </div>
              </div>
              {invoice.earliest_work_date && invoice.latest_work_date && (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    marginBottom: '0.375rem',
                    opacity: 0.65,
                    fontSize: '0.8125rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500
                  }}>
                    <Calendar size={14} />
                    Period of Service
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    {invoice.earliest_work_date === invoice.latest_work_date
                      ? new Date(invoice.earliest_work_date).toLocaleDateString()
                      : `${new Date(invoice.earliest_work_date).toLocaleDateString()} - ${new Date(invoice.latest_work_date).toLocaleDateString()}`
                    }
                  </div>
                </div>
              )}
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem', 
                  marginBottom: '0.375rem',
                  opacity: 0.65,
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 500
                }}>
                  <User size={14} />
                  Client
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {invoice.client_name}
                </div>
                {invoice.client_email && (
                  <div style={{ fontSize: '0.8125rem', opacity: 0.6, marginTop: '0.25rem' }}>
                    {invoice.client_email}
                  </div>
                )}
              </div>
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem', 
                  marginBottom: '0.375rem',
                  opacity: 0.65,
                  fontSize: '0.8125rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 500
                }}>
                  <FileText size={14} />
                  Status
                </div>
                <div>
                  <span className={`badge badge-${invoice.status}`}>
                    {invoice.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ 
              padding: '1.25rem 1.5rem', 
              borderBottom: '1px solid var(--border)' 
            }}>
              <h3 style={{ 
                fontSize: '1.125rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--foreground)'
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
                        padding: '0.875rem 1.5rem', 
                        fontWeight: 600, 
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.65
                      }}>
                        Item
                      </th>
                      <th style={{ 
                        padding: '0.875rem 1.5rem', 
                        fontWeight: 600, 
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.65
                      }}>
                        Qty
                      </th>
                      <th style={{ 
                        padding: '0.875rem 1.5rem', 
                        fontWeight: 600, 
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.65
                      }}>
                        Rate
                      </th>
                      <th style={{ 
                        padding: '0.875rem 1.5rem', 
                        fontWeight: 600, 
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.65
                      }}>
                        Discount
                      </th>
                      <th style={{ 
                        padding: '0.875rem 1.5rem', 
                        fontWeight: 600, 
                        textAlign: 'right',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.65
                      }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line, index) => {
                      const isEditing = editingLineId === line.id;
                      const isLastLine = index === invoice.lines.length - 1;
                      
                      return (
                        <React.Fragment key={line.id}>
                          {/* Main line item row */}
                          <tr 
                            style={{
                              borderBottom: 'none',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => !isEditing && (e.currentTarget.style.background = 'var(--glass-bg)')}
                            onMouseLeave={(e) => !isEditing && (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '1rem 1.5rem', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {line.work_type_description || line.work_type_code || 'Work'}
                                {line.project_name && ` - ${line.project_name}`}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                              {formatQuantity(line.total_minutes)}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                              {formatCurrency(line.hourly_rate_cents)}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--secondary)', verticalAlign: 'middle' }}>
                              {invoice.discount_percent > 0 ? `${invoice.discount_percent}%` : '0%'}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', verticalAlign: 'middle' }}>
                              {formatCurrency(line.amount_cents)}
                            </td>
                          </tr>
                          {/* Description row */}
                          <tr 
                            style={{
                              borderBottom: !isLastLine ? '1px solid var(--border)' : 'none',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => !isEditing && (e.currentTarget.style.background = 'var(--glass-bg)')}
                            onMouseLeave={(e) => !isEditing && (e.currentTarget.style.background = 'transparent')}
                          >
                            <td 
                              colSpan={5} 
                              style={{ 
                                padding: isEditing ? '1rem 1.5rem' : '0.625rem 1.5rem 1rem 1.5rem',
                                verticalAlign: 'top'
                              }}
                            >
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <textarea
                                    value={editingDescription}
                                    onChange={(e) => setEditingDescription(e.target.value)}
                                    style={{
                                      width: '100%',
                                      minHeight: '80px',
                                      padding: '0.75rem',
                                      borderRadius: 'var(--radius-md)',
                                      border: '1px solid var(--border)',
                                      background: 'var(--card-bg)',
                                      color: 'inherit',
                                      fontFamily: 'inherit',
                                      fontSize: '0.8125rem',
                                      resize: 'vertical',
                                      lineHeight: 1.5
                                    }}
                                    placeholder="Enter description..."
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={savingDescription}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.375rem 0.875rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        borderRadius: '0.375rem',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--foreground)',
                                        cursor: savingDescription ? 'not-allowed' : 'pointer',
                                        opacity: savingDescription ? 0.6 : 1,
                                        transition: 'background-color 0.15s ease',
                                        fontFamily: 'var(--font-sans)',
                                        gap: '0.375rem',
                                        lineHeight: 1.2
                                      }}
                                      onMouseEnter={(e) => !savingDescription && (e.currentTarget.style.backgroundColor = 'var(--border)')}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <X size={13} />
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveDescription(line.id)}
                                      disabled={savingDescription}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.375rem 0.875rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        borderRadius: '0.375rem',
                                        border: 'none',
                                        background: 'var(--foreground)',
                                        color: 'var(--background)',
                                        cursor: savingDescription ? 'not-allowed' : 'pointer',
                                        opacity: savingDescription ? 0.6 : 1,
                                        transition: 'opacity 0.15s ease',
                                        fontFamily: 'var(--font-sans)',
                                        gap: '0.375rem',
                                        lineHeight: 1.2
                                      }}
                                      onMouseEnter={(e) => !savingDescription && (e.currentTarget.style.opacity = '0.85')}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = savingDescription ? '0.6' : '1'}
                                    >
                                      {savingDescription ? (
                                        <>
                                          <Loader2 className="animate-spin" size={13} />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Check size={13} />
                                          Save
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ position: 'relative', paddingRight: '3.5rem' }}>
                                  <div style={{ 
                                    fontSize: '0.8125rem', 
                                    opacity: 0.7, 
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    minHeight: '1.25rem'
                                  }}>
                                    {line.description || (
                                      <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No description</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleEditDescription(line)}
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      right: 0,
                                      padding: '0.375rem 0.625rem',
                                      background: 'var(--card-bg)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer',
                                      opacity: 0.6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.375rem',
                                      fontSize: '0.75rem',
                                      transition: 'opacity 0.15s ease',
                                      color: 'inherit'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                  >
                                    <Edit2 size={12} />
                                    Edit
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.875rem' }}>
                No line items found
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="flex flex-col invoice-detail-sidebar" style={{ position: 'sticky', top: '1.5rem', gap: '1.25rem' }}>
          <div className="card invoice-detail-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ 
              marginBottom: '1.25rem', 
              fontSize: '1.125rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--foreground)'
            }}>
              Summary
            </h3>
            <div className="flex flex-col" style={{ gap: '0.875rem' }}>
              <div className="flex justify-between items-center">
                <div style={{ opacity: 0.65, fontSize: '0.875rem' }}>Subtotal</div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {formatCurrency(invoice.subtotal_cents)}
                </div>
              </div>
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between items-center">
                  <div style={{ opacity: 0.65, fontSize: '0.875rem' }}>Discount ({invoice.discount_percent || 0}%)</div>
                  <div style={{ fontWeight: 600, color: 'var(--secondary)', fontSize: '0.9375rem' }}>
                    -{formatCurrency(invoice.discount_cents)}
                  </div>
                </div>
              )}
              <div style={{ 
                height: '1px', 
                background: 'var(--border)', 
                margin: '0.5rem 0' 
              }} />
              <div className="flex justify-between items-center" style={{ paddingTop: '0.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Total</div>
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: '1.5rem',
                  color: 'var(--foreground)'
                }}>
                  {formatCurrency(invoice.total_cents)}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="card invoice-detail-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ 
              marginBottom: '1.25rem', 
              fontSize: '1.125rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--foreground)'
            }}>
              Details
            </h3>
            <div className="flex flex-col" style={{ gap: '1rem' }}>
              <div>
                <div style={{ 
                  opacity: 0.65, 
                  fontSize: '0.75rem', 
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 500
                }}>
                  Invoice Number
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  INV-{invoice.invoice_number}
                </div>
              </div>
              <div>
                <div style={{ 
                  opacity: 0.65, 
                  fontSize: '0.75rem', 
                  marginBottom: '0.375rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 500
                }}>
                  Created
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {new Date(invoice.created_at).toLocaleDateString()}
                </div>
              </div>
              {invoice.updated_at && (
                <div>
                  <div style={{ 
                    opacity: 0.65, 
                    fontSize: '0.75rem', 
                    marginBottom: '0.375rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500
                  }}>
                    Last Updated
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {new Date(invoice.updated_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }} onClick={handleDeleteCancel}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                background: 'var(--card-bg)',
                width: '100%',
                maxWidth: '400px',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ef4444'
                  }}>
                    <AlertTriangle size={24} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Delete Invoice</h2>
                </div>
                <p style={{ marginBottom: '2rem', opacity: 0.8, lineHeight: 1.6 }}>
                  Are you sure you want to delete invoice <strong>INV-{invoice?.invoice_number}</strong> for <strong>{invoice?.client_name}</strong>? This action cannot be undone.
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem'
                }}>
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    disabled={deleting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.375rem',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--foreground)',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.6 : 1,
                      transition: 'background-color 0.15s ease',
                      fontFamily: 'var(--font-sans)',
                      lineHeight: 1.2,
                      minHeight: '36px'
                    }}
                    onMouseEnter={(e) => !deleting && (e.currentTarget.style.backgroundColor = 'var(--border)')}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: '#ef4444',
                      color: 'white',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.6 : 1,
                      transition: 'opacity 0.15s ease',
                      fontFamily: 'var(--font-sans)',
                      gap: '0.5rem',
                      lineHeight: 1.2,
                      minHeight: '36px'
                    }}
                    onMouseEnter={(e) => !deleting && (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = deleting ? '0.6' : '1'}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Deleting...
                      </>
                    ) : (
                      'Delete Invoice'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InvoiceDetail;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, Loader2, Trash2, Eye, AlertTriangle, Send, FileEdit } from 'lucide-react';
import api from '../services/api';

const InvoiceList = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [markingAsSent, setMarkingAsSent] = useState(null);
    const [markingAsDraft, setMarkingAsDraft] = useState(null);

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const statusFilter = searchParams.get('status');
            const filters = statusFilter ? { status: statusFilter } : {};
            const data = await api.getInvoices(filters);
            setInvoices(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError('Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const filteredInvoices = invoices.filter(invoice => {
        // Search filter
        const matchesSearch = String(invoice.invoice_number).includes(searchTerm) ||
            invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // Overdue filter from URL params
        const overdueFilter = searchParams.get('overdue');
        if (overdueFilter === 'true') {
            const now = new Date();
            const dueDate = new Date(invoice.due_date);
            const isOverdue = dueDate < now && (invoice.status === 'sent' || invoice.status === 'partially_paid');
            return isOverdue;
        }

        return true;
    });

    const handlePreview = (invoice) => {
        navigate(`/invoices/${invoice.id}/view`);
    };

    const handleDownload = async (invoice) => {
        try {
            setLoadingInvoice(true);
            await api.downloadInvoicePDF(invoice.id);
        } catch (err) {
            console.error('Error downloading invoice:', err);
            setError('Failed to download invoice PDF');
        } finally {
            setLoadingInvoice(false);
        }
    };

    const handleDeleteClick = (invoice) => {
        setInvoiceToDelete(invoice);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!invoiceToDelete) return;

        try {
            setDeleting(true);
            await api.deleteInvoice(invoiceToDelete.id);
            setInvoices(invoices.filter(invoice => invoice.id !== invoiceToDelete.id));
            setDeleteModalOpen(false);
            setInvoiceToDelete(null);
        } catch (err) {
            console.error('Error deleting invoice:', err);
            setError('Failed to delete invoice. Please try again.');
            setDeleteModalOpen(false);
            setInvoiceToDelete(null);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setInvoiceToDelete(null);
    };

    const handleMarkAsSent = async (invoice) => {
        try {
            setMarkingAsSent(invoice.id);
            await api.markInvoiceAsSent(invoice.id);
            // Update the invoice in the list
            setInvoices(invoices.map(inv => 
                inv.id === invoice.id ? { ...inv, status: 'sent' } : inv
            ));
        } catch (err) {
            console.error('Error marking invoice as sent:', err);
            setError('Failed to mark invoice as sent. Please try again.');
        } finally {
            setMarkingAsSent(null);
        }
    };

    const handleMarkAsDraft = async (invoice) => {
        try {
            setMarkingAsDraft(invoice.id);
            await api.markInvoiceAsDraft(invoice.id);
            // Update the invoice in the list
            setInvoices(invoices.map(inv => 
                inv.id === invoice.id ? { ...inv, status: 'draft' } : inv
            ));
        } catch (err) {
            console.error('Error marking invoice as draft:', err);
            setError('Failed to mark invoice as draft. Please try again.');
        } finally {
            setMarkingAsDraft(null);
        }
    };

    const formatCurrency = (cents) => {
        return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: { bg: '#F5F5F5', text: '#525252', border: '#E5E5E5' },
            sent: { bg: '#EFF6FF', text: '#1E40AF', border: '#DBEAFE' },
            paid: { bg: '#F0FDF4', text: '#166534', border: '#DCFCE7' },
            partially_paid: { bg: '#FFFBEB', text: '#92400E', border: '#FEF3C7' },
            voided: { bg: '#FEF2F2', text: '#991B1B', border: '#FEE2E2' }
        };
        return colors[status] || colors.draft;
    };

    const isOverdue = (invoice) => {
        if (invoice.status !== 'sent' && invoice.status !== 'partially_paid') return false;
        const now = new Date();
        const dueDate = new Date(invoice.due_date);
        return dueDate < now;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <Loader2 className="animate-spin" size={32} style={{ opacity: 0.4 }} />
            </div>
        );
    }

    return (
        <div className="flex flex-col" style={{ gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '32px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        letterSpacing: '-0.02em',
                        marginBottom: '4px',
                        color: 'var(--foreground)'
                    }}>
                        Invoices
                    </h1>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        fontWeight: '400'
                    }}>
                        {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        backgroundColor: 'var(--card-bg)',
                        width: '280px'
                    }}>
                        <Search size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Search by number or client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'inherit',
                                padding: 0,
                                outline: 'none',
                                width: '100%',
                                fontSize: '0.875rem',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div style={{
                    padding: '1rem 1.25rem',
                    border: '1px solid #FEE2E2',
                    borderRadius: '0.5rem',
                    backgroundColor: '#FEF2F2',
                    color: '#991B1B',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {/* Empty State */}
            {!error && filteredInvoices.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--card-bg)'
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        opacity: 0.5
                    }}>
                        {searchTerm ? 'No invoices match your search.' : 'No invoices found.'}
                    </div>
                </div>
            )}

            {/* Invoice List */}
            {!error && filteredInvoices.length > 0 && (
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--card-bg)',
                    overflow: 'hidden'
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr 2fr 1.2fr 1.2fr 1fr 0.8fr',
                        gap: '1.5rem',
                        padding: '0.875rem 1.5rem',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: 'var(--background)'
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Invoice
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Client
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'right'
                        }}>
                            Amount
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Due Date
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Status
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textAlign: 'right'
                        }}>
                            Actions
                        </div>
                    </div>

                    {/* Invoice Rows */}
                    <div>
                        {filteredInvoices.map((invoice, index) => {
                            const statusColor = getStatusColor(invoice.status);
                            const overdue = isOverdue(invoice);
                            
                            return (
                                <div key={invoice.id}>
                                    <div
                                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                                            style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1.5fr 2fr 1.2fr 1.2fr 1fr 0.8fr',
                                            gap: '1.5rem',
                                            padding: '1rem 1.5rem',
                                            borderBottom: index !== filteredInvoices.length - 1 ? '1px solid var(--border)' : 'none',
                                                cursor: 'pointer',
                                            transition: 'background-color 0.15s ease',
                                            backgroundColor: 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {/* Invoice Number */}
                                        <div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: 'var(--foreground)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                INV-{invoice.invoice_number}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--foreground)',
                                                opacity: 0.5
                                            }}>
                                                {formatDate(invoice.invoice_date)}
                                            </div>
                                        </div>

                                        {/* Client */}
                                        <div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: 'var(--foreground)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {invoice.client_name}
                                            </div>
                                            {invoice.client_email && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--foreground)',
                                                    opacity: 0.5
                                                }}>
                                                    {invoice.client_email}
                                                </div>
                                            )}
                                        </div>

                                        {/* Amount */}
                                        <div style={{
                                            textAlign: 'right',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                color: 'var(--foreground)'
                                            }}>
                                                {formatCurrency(invoice.total_cents)}
                                            </div>
                                            {overdue && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#DC2626',
                                                    marginTop: '0.25rem',
                                                    fontWeight: 500
                                                }}>
                                                    Overdue
                                                </div>
                                            )}
                                        </div>

                                        {/* Due Date */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: overdue ? '#DC2626' : 'var(--foreground)',
                                                fontWeight: overdue ? 600 : 400
                                            }}>
                                                {formatDate(invoice.due_date)}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '0.25rem 0.625rem',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                backgroundColor: statusColor.bg,
                                                color: statusColor.text,
                                                border: `1px solid ${statusColor.border}`,
                                                textTransform: 'capitalize'
                                            }}>
                                                {invoice.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: '0.5rem'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        >
                                            {invoice.status === 'draft' && (
                                                <button
                                                    onClick={() => handleMarkAsSent(invoice)}
                                                    disabled={loadingInvoice || markingAsSent === invoice.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0.375rem',
                                                        borderRadius: '0.375rem',
                                                        border: '1px solid var(--border)',
                                                        background: 'transparent',
                                                        color: 'var(--foreground)',
                                                        cursor: (loadingInvoice || markingAsSent === invoice.id) ? 'not-allowed' : 'pointer',
                                                        opacity: (loadingInvoice || markingAsSent === invoice.id) ? 0.5 : 1,
                                                        transition: 'background-color 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!loadingInvoice && markingAsSent !== invoice.id) {
                                                            e.currentTarget.style.backgroundColor = 'var(--border)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                    title="Mark as Sent"
                                                >
                                                    {markingAsSent === invoice.id ? (
                                                        <Loader2 className="animate-spin" size={14} />
                                                    ) : (
                                                        <Send size={14} />
                                                    )}
                                                </button>
                                            )}
                                            {(invoice.status === 'sent' || invoice.status === 'partially_paid') && (
                                                <button
                                                    onClick={() => handleMarkAsDraft(invoice)}
                                                    disabled={loadingInvoice || markingAsDraft === invoice.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '0.375rem',
                                                        borderRadius: '0.375rem',
                                                        border: '1px solid var(--border)',
                                                        background: 'transparent',
                                                        color: 'var(--foreground)',
                                                        cursor: (loadingInvoice || markingAsDraft === invoice.id) ? 'not-allowed' : 'pointer',
                                                        opacity: (loadingInvoice || markingAsDraft === invoice.id) ? 0.5 : 1,
                                                        transition: 'background-color 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!loadingInvoice && markingAsDraft !== invoice.id) {
                                                            e.currentTarget.style.backgroundColor = 'var(--border)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                    title="Mark as Draft"
                                                >
                                                    {markingAsDraft === invoice.id ? (
                                                        <Loader2 className="animate-spin" size={14} />
                                                    ) : (
                                                        <FileEdit size={14} />
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handlePreview(invoice)}
                                                disabled={loadingInvoice}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0.375rem',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid var(--border)',
                                                    background: 'transparent',
                                                    color: 'var(--foreground)',
                                                    cursor: loadingInvoice ? 'not-allowed' : 'pointer',
                                                    opacity: loadingInvoice ? 0.5 : 1,
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!loadingInvoice) {
                                                        e.currentTarget.style.backgroundColor = 'var(--border)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                title="Preview"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(invoice)}
                                                disabled={loadingInvoice}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0.375rem',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid var(--border)',
                                                    background: 'transparent',
                                                    color: 'var(--foreground)',
                                                    cursor: loadingInvoice ? 'not-allowed' : 'pointer',
                                                    opacity: loadingInvoice ? 0.5 : 1,
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!loadingInvoice) {
                                                        e.currentTarget.style.backgroundColor = 'var(--border)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                title="Download PDF"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(invoice)}
                                                disabled={loadingInvoice || deleting}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0.375rem',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid #FEE2E2',
                                                    background: 'transparent',
                                                    color: '#DC2626',
                                                    cursor: (loadingInvoice || deleting) ? 'not-allowed' : 'pointer',
                                                    opacity: (loadingInvoice || deleting) ? 0.5 : 1,
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!loadingInvoice && !deleting) {
                                                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
                {deleteModalOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '2rem'
                    }} onClick={handleDeleteCancel}>
                    <div
                            style={{
                            background: 'var(--card-bg)',
                                width: '100%',
                            maxWidth: '420px',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--border)',
                                overflow: 'hidden'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ padding: '2rem' }}>
                                <div style={{
                                    display: 'flex',
                                alignItems: 'flex-start',
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{
                                    padding: '0.625rem',
                                    background: '#FEE2E2',
                                    borderRadius: '0.5rem',
                                    color: '#DC2626',
                                    flexShrink: 0
                                }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: 'var(--foreground)',
                                        marginBottom: '0.5rem',
                                        letterSpacing: '-0.01em'
                                    }}>
                                        Delete Invoice
                                    </h2>
                                    <p style={{
                                        fontSize: '0.875rem',
                                        color: 'var(--foreground)',
                                        opacity: 0.7,
                                        lineHeight: 1.5,
                                        margin: 0
                                    }}>
                                        Are you sure you want to delete invoice <strong>INV-{invoiceToDelete?.invoice_number}</strong> for <strong>{invoiceToDelete?.client_name}</strong>? This action cannot be undone.
                                    </p>
                                </div>
                            </div>
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
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--foreground)',
                                        cursor: deleting ? 'not-allowed' : 'pointer',
                                        opacity: deleting ? 0.5 : 1,
                                        transition: 'background-color 0.15s ease',
                                        fontFamily: 'var(--font-sans)',
                                        lineHeight: 1.2
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!deleting) {
                                            e.currentTarget.style.backgroundColor = 'var(--border)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
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
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        background: '#DC2626',
                                        color: 'white',
                                        cursor: deleting ? 'not-allowed' : 'pointer',
                                        opacity: deleting ? 0.6 : 1,
                                        transition: 'opacity 0.15s ease',
                                        fontFamily: 'var(--font-sans)',
                                        gap: '0.5rem',
                                        lineHeight: 1.2
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!deleting) {
                                            e.currentTarget.style.opacity = '0.9';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = deleting ? '0.6' : '1';
                                        }}
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
                    </div>
                    </div>
                )}
        </div>
    );
};

export default InvoiceList;

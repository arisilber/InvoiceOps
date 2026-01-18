import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, Loader2, Trash2, Eye, AlertTriangle, Send, FileEdit, Filter, X } from 'lucide-react';
import api from '../services/api';

const InvoiceList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [markingAsSent, setMarkingAsSent] = useState(null);
    const [markingAsDraft, setMarkingAsDraft] = useState(null);
    
    // Filter states
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
    const [clientFilter, setClientFilter] = useState(searchParams.get('client_id') || '');
    const [overdueFilter, setOverdueFilter] = useState(searchParams.get('overdue') === 'true');
    const [dateFromFilter, setDateFromFilter] = useState(searchParams.get('date_from') || '');
    const [dateToFilter, setDateToFilter] = useState(searchParams.get('date_to') || '');
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    const fetchClients = useCallback(async () => {
        try {
            const data = await api.getClients();
            setClients(data);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const filters = {};
            if (statusFilter) filters.status = statusFilter;
            if (clientFilter) filters.client_id = clientFilter;
            const data = await api.getInvoices(filters);
            setInvoices(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError('Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, clientFilter]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    // Update URL params when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (clientFilter) params.set('client_id', clientFilter);
        if (overdueFilter) params.set('overdue', 'true');
        if (dateFromFilter) params.set('date_from', dateFromFilter);
        if (dateToFilter) params.set('date_to', dateToFilter);
        
        setSearchParams(params, { replace: true });
    }, [statusFilter, clientFilter, overdueFilter, dateFromFilter, dateToFilter, setSearchParams]);

    const filteredInvoices = invoices.filter(invoice => {
        // Search filter
        const matchesSearch = String(invoice.invoice_number).includes(searchTerm) ||
            invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // Overdue filter
        if (overdueFilter) {
            const now = new Date();
            const dueDate = new Date(invoice.due_date);
            const isOverdue = dueDate < now && (invoice.status === 'sent' || invoice.status === 'partially_paid');
            if (!isOverdue) return false;
        }

        // Date range filters
        if (dateFromFilter) {
            const invoiceDate = new Date(invoice.invoice_date);
            const fromDate = new Date(dateFromFilter);
            fromDate.setHours(0, 0, 0, 0);
            if (invoiceDate < fromDate) return false;
        }

        if (dateToFilter) {
            const invoiceDate = new Date(invoice.invoice_date);
            const toDate = new Date(dateToFilter);
            toDate.setHours(23, 59, 59, 999);
            if (invoiceDate > toDate) return false;
        }

        return true;
    });

    const hasActiveFilters = statusFilter || clientFilter || overdueFilter || dateFromFilter || dateToFilter;

    const clearFilters = () => {
        setStatusFilter('');
        setClientFilter('');
        setOverdueFilter(false);
        setDateFromFilter('');
        setDateToFilter('');
    };

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

    // Calculate totals
    const calculateTotals = () => {
        const totals = {
            totalAmount: 0,
            overdueAmount: 0,
            overdueCount: 0,
            byStatus: {
                draft: { count: 0, amount: 0 },
                sent: { count: 0, amount: 0 },
                paid: { count: 0, amount: 0 },
                partially_paid: { count: 0, amount: 0 },
                voided: { count: 0, amount: 0 }
            }
        };

        filteredInvoices.forEach(invoice => {
            const amount = invoice.total_cents || 0;
            totals.totalAmount += amount;
            
            const status = invoice.status || 'draft';
            if (totals.byStatus[status]) {
                totals.byStatus[status].count += 1;
                totals.byStatus[status].amount += amount;
            }

            if (isOverdue(invoice)) {
                totals.overdueAmount += amount;
                totals.overdueCount += 1;
            }
        });

        return totals;
    };

    const totals = calculateTotals();

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

            {/* Filters */}
            <div style={{
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--card-bg)',
                marginBottom: '1.5rem',
                overflow: 'hidden'
            }}>
                {/* Filter Toggle Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem'
                }}>
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'var(--foreground)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <Filter size={16} />
                        Filters
                        {hasActiveFilters && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '20px',
                                height: '20px',
                                padding: '0 6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'white',
                                backgroundColor: 'var(--primary)',
                                borderRadius: '10px'
                            }}>
                                {[statusFilter, clientFilter, overdueFilter, dateFromFilter, dateToFilter].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--foreground)',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                                fontFamily: 'inherit',
                                opacity: 0.7
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.opacity = '0.7';
                            }}
                        >
                            <X size={14} />
                            Clear
                        </button>
                    )}
                </div>

                {/* Expanded Filters */}
                {filtersExpanded && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        padding: '1.25rem',
                        borderTop: '1px solid var(--border)'
                    }}>
                        {/* Status Filter */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: 'var(--foreground)',
                                opacity: 0.7,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    fontFamily: 'inherit',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            >
                                <option value="">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="partially_paid">Partially Paid</option>
                                <option value="paid">Paid</option>
                                <option value="voided">Voided</option>
                            </select>
                        </div>

                        {/* Client Filter */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: 'var(--foreground)',
                                opacity: 0.7,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Client
                            </label>
                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    fontFamily: 'inherit',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            >
                                <option value="">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From Filter */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: 'var(--foreground)',
                                opacity: 0.7,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Date From
                            </label>
                            <input
                                type="date"
                                value={dateFromFilter}
                                onChange={(e) => setDateFromFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    fontFamily: 'inherit',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        {/* Date To Filter */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: 'var(--foreground)',
                                opacity: 0.7,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Date To
                            </label>
                            <input
                                type="date"
                                value={dateToFilter}
                                onChange={(e) => setDateToFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem',
                                    fontSize: '0.875rem',
                                    fontFamily: 'inherit',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        {/* Overdue Filter */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            paddingBottom: '0.5rem'
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={overdueFilter}
                                    onChange={(e) => setOverdueFilter(e.target.checked)}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer',
                                        accentColor: 'var(--primary)'
                                    }}
                                />
                                <span>Show only overdue</span>
                            </label>
                        </div>
                    </div>
                )}
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

            {/* Totals Summary */}
            {!error && filteredInvoices.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    {/* Total Amount */}
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        backgroundColor: 'var(--card-bg)'
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Total Amount
                        </div>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            letterSpacing: '-0.02em'
                        }}>
                            {formatCurrency(totals.totalAmount)}
                        </div>
                    </div>

                    {/* Overdue Amount */}
                    {totals.overdueCount > 0 && (
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            border: '1px solid #FEE2E2',
                            borderRadius: '0.5rem',
                            backgroundColor: '#FEF2F2'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: '#991B1B',
                                opacity: 0.8,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Overdue
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: '#DC2626',
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(totals.overdueAmount)}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#991B1B',
                                opacity: 0.7,
                                marginTop: '0.25rem'
                            }}>
                                {totals.overdueCount} {totals.overdueCount === 1 ? 'invoice' : 'invoices'}
                            </div>
                        </div>
                    )}

                    {/* Paid Amount */}
                    {totals.byStatus.paid.count > 0 && (
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            border: '1px solid #DCFCE7',
                            borderRadius: '0.5rem',
                            backgroundColor: '#F0FDF4'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: '#166534',
                                opacity: 0.8,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Paid
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: '#166534',
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(totals.byStatus.paid.amount)}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#166534',
                                opacity: 0.7,
                                marginTop: '0.25rem'
                            }}>
                                {totals.byStatus.paid.count} {totals.byStatus.paid.count === 1 ? 'invoice' : 'invoices'}
                            </div>
                        </div>
                    )}

                    {/* Outstanding (Sent + Partially Paid) */}
                    {(totals.byStatus.sent.count > 0 || totals.byStatus.partially_paid.count > 0) && (
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            border: '1px solid #DBEAFE',
                            borderRadius: '0.5rem',
                            backgroundColor: '#EFF6FF'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: '#1E40AF',
                                opacity: 0.8,
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Outstanding
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: '#1E40AF',
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(totals.byStatus.sent.amount + totals.byStatus.partially_paid.amount)}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#1E40AF',
                                opacity: 0.7,
                                marginTop: '0.25rem'
                            }}>
                                {totals.byStatus.sent.count + totals.byStatus.partially_paid.count} {totals.byStatus.sent.count + totals.byStatus.partially_paid.count === 1 ? 'invoice' : 'invoices'}
                            </div>
                        </div>
                    )}
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
                                            borderBottom: '1px solid var(--border)',
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

                    {/* Totals Footer */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr 2fr 1.2fr 1.2fr 1fr 0.8fr',
                        gap: '1.5rem',
                        padding: '1rem 1.5rem',
                        borderTop: '2px solid var(--border)',
                        backgroundColor: 'var(--background)'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Total
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'var(--foreground)',
                            opacity: 0.5
                        }}>
                            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                        </div>
                        <div style={{
                            textAlign: 'right',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--foreground)'
                        }}>
                            {formatCurrency(totals.totalAmount)}
                        </div>
                        <div></div>
                        <div></div>
                        <div></div>
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

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, Loader2, Trash2, Eye, AlertTriangle, Send, FileEdit } from 'lucide-react';
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

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
        >
            <header className="flex justify-between items-center">
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Invoices</h2>
                    <p style={{ opacity: 0.7 }}>Manage and track all your client invoices.</p>
                </div>
                <div className="flex gap-2">
                    <div className="glass flex items-center gap-2" style={{ padding: '0 1rem', borderRadius: 'var(--radius-md)' }}>
                        <Search size={18} style={{ opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'inherit',
                                padding: '0.625rem 0',
                                outline: 'none',
                                width: '200px'
                            }}
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <Filter size={18} />
                        Filter
                    </button>
                </div>
            </header>

            {error && (
                <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
                    {error}
                </div>
            )}

            {!error && filteredInvoices.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ opacity: 0.5 }}>No invoices found.</div>
                </div>
            )}

            {!error && filteredInvoices.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Invoice ID</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Client</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Amount</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((invoice, index) => (
                                <tr key={invoice.id} style={{
                                    borderBottom: index !== filteredInvoices.length - 1 ? '1px solid var(--border)' : 'none',
                                    transition: 'background 0.2s ease'
                                }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                                        <button
                                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'inherit',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                fontWeight: 500,
                                                padding: 0
                                            }}
                                        >
                                            INV-{invoice.invoice_number}
                                        </button>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>{invoice.client_name}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>${(invoice.total_cents / 100).toFixed(2)}</td>
                                    <td style={{ padding: '1rem 1.5rem', opacity: 0.7 }}>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div className="flex gap-2 justify-end">
                                            {invoice.status === 'draft' && (
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.5rem' }}
                                                    onClick={() => handleMarkAsSent(invoice)}
                                                    title="Mark as Sent"
                                                    disabled={loadingInvoice || markingAsSent === invoice.id}
                                                >
                                                    {markingAsSent === invoice.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <Send size={16} />
                                                    )}
                                                </button>
                                            )}
                                            {(invoice.status === 'sent' || invoice.status === 'partially_paid') && (
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem' }}
                                                    onClick={() => handleMarkAsDraft(invoice)}
                                                    title="Mark as Draft"
                                                    disabled={loadingInvoice || markingAsDraft === invoice.id}
                                                >
                                                    {markingAsDraft === invoice.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <FileEdit size={16} />
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.5rem' }}
                                                onClick={() => handlePreview(invoice)}
                                                title="Preview PDF"
                                                disabled={loadingInvoice}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.5rem' }}
                                                onClick={() => handleDownload(invoice)}
                                                title="Download PDF"
                                                disabled={loadingInvoice}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.5rem', color: '#ef4444' }}
                                                onClick={() => handleDeleteClick(invoice)}
                                                title="Delete Invoice"
                                                disabled={loadingInvoice || deleting}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
                                background: 'var(--background)',
                                width: '100%',
                                maxWidth: '400px',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-lg)',
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
                                    Are you sure you want to delete invoice <strong>INV-{invoiceToDelete?.invoice_number}</strong> for <strong>{invoiceToDelete?.client_name}</strong>? This action cannot be undone.
                                </p>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '1rem'
                                }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleDeleteCancel}
                                        disabled={deleting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={handleDeleteConfirm}
                                        disabled={deleting}
                                        style={{
                                            background: '#ef4444',
                                            color: 'white'
                                        }}
                                    >
                                        {deleting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
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

export default InvoiceList;

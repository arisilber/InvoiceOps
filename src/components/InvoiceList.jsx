import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MoreVertical, Download, Loader2, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import InvoicePDFPreview from './InvoicePDFPreview';
import { downloadInvoiceHTMLAsPDF } from '../utils/htmlGenerator';

const InvoiceList = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        if (activeMenu) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const data = await api.getInvoices();
            setInvoices(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError('Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(invoice =>
        String(invoice.invoice_number).includes(searchTerm) ||
        invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePreview = async (invoice) => {
        try {
            setLoadingInvoice(true);
            // Fetch full invoice data with lines
            const fullInvoice = await api.getInvoice(invoice.id);
            setPreviewInvoice(fullInvoice);
            setIsPreviewOpen(true);
        } catch (err) {
            console.error('Error fetching invoice:', err);
            setError('Failed to load invoice for preview');
        } finally {
            setLoadingInvoice(false);
        }
    };

    const handleDownload = async (invoice) => {
        try {
            setLoadingInvoice(true);
            // Fetch full invoice data with lines for PDF generation
            const fullInvoice = await api.getInvoice(invoice.id);
            await downloadInvoiceHTMLAsPDF(fullInvoice);
        } catch (err) {
            console.error('Error downloading invoice:', err);
            setError('Failed to download invoice PDF');
        } finally {
            setLoadingInvoice(false);
        }
    };

    const handleClosePreview = () => {
        setIsPreviewOpen(false);
        setPreviewInvoice(null);
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteInvoice(invoiceId);
            setInvoices(invoices.filter(invoice => invoice.id !== invoiceId));
            setActiveMenu(null);
        } catch (err) {
            console.error('Error deleting invoice:', err);
            setError('Failed to delete invoice. Please try again.');
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
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>INV-{invoice.invoice_number}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>{invoice.client_name}</td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>${(invoice.total_cents / 100).toFixed(2)}</td>
                                    <td style={{ padding: '1rem 1.5rem', opacity: 0.7 }}>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div className="flex gap-2 justify-end">
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
                                            <div style={{ position: 'relative' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(activeMenu === invoice.id ? null : invoice.id);
                                                    }}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                <AnimatePresence>
                                                    {activeMenu === invoice.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                right: 0,
                                                                marginTop: '0.5rem',
                                                                background: 'var(--card-bg)',
                                                                border: '1px solid var(--border)',
                                                                borderRadius: 'var(--radius-md)',
                                                                boxShadow: 'var(--shadow-lg)',
                                                                zIndex: 10,
                                                                minWidth: '150px',
                                                                overflow: 'hidden'
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                className="btn-menu-item"
                                                                style={{ color: 'var(--error)' }}
                                                                onClick={() => {
                                                                    handleDeleteInvoice(invoice.id);
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                                Delete Invoice
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <InvoicePDFPreview
                isOpen={isPreviewOpen}
                onClose={handleClosePreview}
                invoice={previewInvoice}
            />
        </motion.div>
    );
};

export default InvoiceList;

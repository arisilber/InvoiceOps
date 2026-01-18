import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const CreateInvoiceFromTimeEntriesModal = ({ isOpen, onClose, onInvoiceCreated }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [earliestEntryLoading, setEarliestEntryLoading] = useState(false);
    const [earliestEntry, setEarliestEntry] = useState(null);

    const [formData, setFormData] = useState({
        client_id: '',
        start_date: '',
        end_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            // Calculate start date as 30 days ago
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            setFormData(prev => ({
                ...prev,
                start_date: startDate.toISOString().split('T')[0],
                client_id: '',
                invoice_number: ''
            }));
            setPreview(null);
            setPreviewError(null);
            setEarliestEntry(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && formData.client_id) {
            fetchEarliestUninvoicedEntry();
        } else {
            setEarliestEntry(null);
        }
    }, [formData.client_id, isOpen]);

    useEffect(() => {
        if (isOpen && formData.client_id && formData.start_date && formData.end_date) {
            // Debounce preview fetch
            const timer = setTimeout(() => {
                fetchPreview();
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setPreview(null);
            setPreviewError(null);
        }
    }, [formData.client_id, formData.start_date, formData.end_date, isOpen]);


    // Generate AI descriptions line by line when preview loads

    const fetchClients = async () => {
        try {
            const clientsData = await api.getClients();
            setClients(clientsData);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    };

    const fetchEarliestUninvoicedEntry = async () => {
        if (!formData.client_id) {
            return;
        }

        setEarliestEntryLoading(true);
        try {
            const entries = await api.getTimeEntries({
                client_id: formData.client_id,
                is_invoiced: 'false'
            });

            if (entries && entries.length > 0) {
                // Sort by work_date ascending to get earliest
                const sortedEntries = [...entries].sort((a, b) => 
                    new Date(a.work_date) - new Date(b.work_date)
                );
                const earliest = sortedEntries[0];
                setEarliestEntry(earliest);

                // Auto-populate start date with earliest entry date
                if (earliest.work_date) {
                    setFormData(prev => ({
                        ...prev,
                        start_date: earliest.work_date
                    }));
                }
            } else {
                setEarliestEntry(null);
            }
        } catch (err) {
            console.error('Error fetching earliest uninvoiced entry:', err);
            setEarliestEntry(null);
        } finally {
            setEarliestEntryLoading(false);
        }
    };

    const fetchPreview = async () => {
        if (!formData.client_id || !formData.start_date || !formData.end_date) {
            return;
        }

        setPreviewLoading(true);
        setPreviewError(null);
        try {
            const previewData = await api.previewInvoiceFromTimeEntries(
                parseInt(formData.client_id),
                formData.start_date,
                formData.end_date
            );
            setPreview(previewData);

            // Auto-fetch next invoice number if not set
            if (!formData.invoice_number && previewData.lines.length > 0) {
                try {
                    const nextNumber = await api.getNextInvoiceNumber();
                    setFormData(prev => ({ ...prev, invoice_number: nextNumber.toString() }));
                } catch (err) {
                    console.error('Error fetching next invoice number:', err);
                }
            }
        } catch (err) {
            console.error('Error fetching preview:', err);
            setPreviewError(err.message || 'Failed to load preview');
            setPreview(null);
        } finally {
            setPreviewLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!preview || preview.lines.length === 0) {
            alert('No time entries available to invoice');
            return;
        }

        try {
            setLoading(true);
            await api.createInvoiceFromTimeEntries({
                client_id: parseInt(formData.client_id),
                start_date: formData.start_date,
                end_date: formData.end_date,
                invoice_number: parseInt(formData.invoice_number),
                invoice_date: formData.invoice_date,
                due_date: formData.due_date
            });
            onInvoiceCreated();
            onClose();
        } catch (err) {
            console.error('Error creating invoice:', err);
            alert(err.message || 'Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const formatQuantity = (minutes) => {
        const hours = minutes / 60;
        return hours.toFixed(2);
    };

    const formatCurrency = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
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
            }} onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    style={{
                        background: 'var(--background)',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <header style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={24} />
                            Create Invoice from Time Entries
                        </h2>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </header>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            {/* Selection Form */}
                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="flex flex-col gap-2">
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Client *</label>
                                    <select
                                        required
                                        value={formData.client_id}
                                        onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                        className="glass"
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            outline: 'none',
                                            background: 'var(--card-bg)',
                                            color: 'inherit'
                                        }}
                                    >
                                        <option value="">Select Client</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        disabled={!formData.client_id}
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="glass"
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            outline: 'none',
                                            background: 'var(--card-bg)',
                                            color: 'inherit',
                                            opacity: !formData.client_id ? 0.5 : 1,
                                            cursor: !formData.client_id ? 'not-allowed' : 'auto'
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        disabled={!formData.client_id}
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        className="glass"
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            outline: 'none',
                                            background: 'var(--card-bg)',
                                            color: 'inherit',
                                            opacity: !formData.client_id ? 0.5 : 1,
                                            cursor: !formData.client_id ? 'not-allowed' : 'auto'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Earliest Uninvoiced Entry Information */}
                            {formData.client_id && (
                                <div style={{ 
                                    marginBottom: '1.5rem',
                                    padding: '0.875rem 1rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--card-bg)',
                                    fontSize: '0.875rem',
                                    lineHeight: '1.5'
                                }}>
                                    {earliestEntryLoading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>Retrieving earliest uninvoiced time entry...</span>
                                        </div>
                                    ) : earliestEntry ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
                                            <span style={{ opacity: 0.85 }}>
                                                <strong>Earliest uninvoiced time entry:</strong> {new Date(earliestEntry.work_date).toLocaleDateString('en-US', { 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                                            <AlertCircle size={16} />
                                            <span>No uninvoiced time entries found for this client.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Preview Section */}
                            {previewLoading && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem' }}>
                                    <Loader2 className="animate-spin" size={32} style={{ opacity: 0.5 }} />
                                    <p style={{ opacity: 0.6 }}>Loading preview...</p>
                                </div>
                            )}

                            {previewError && (
                                <div className="card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    color: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    marginBottom: '2rem',
                                    padding: '1rem'
                                }}>
                                    <AlertCircle size={24} />
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No time entries found</div>
                                        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{previewError}</div>
                                    </div>
                                </div>
                            )}

                            {preview && preview.lines.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                                            Invoice Preview
                                        </h3>
                                        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                            {preview.total_entries} time {preview.total_entries === 1 ? 'entry' : 'entries'}
                                        </div>
                                    </div>

                                    {/* Invoice Lines Preview */}
                                    <div className="card glass" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                                                <tr>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'left' }}>Work Type</th>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'left' }}>Description</th>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'left' }}>Project</th>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'right' }}>Qty</th>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'right' }}>Rate</th>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'right' }}>Discount</th>
                                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, textAlign: 'right' }}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.lines.map((line, index) => (
                                                    <tr key={index} style={{ borderBottom: index !== preview.lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ fontWeight: 600 }}>{line.work_type_description || line.work_type_code}</div>
                                                            {line.work_type_description && line.work_type_code && (
                                                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{line.work_type_code}</div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', maxWidth: '300px' }}>
                                                            {line.description ? (
                                                                <div style={{ fontSize: '0.875rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                                                                    {line.description}
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.875rem', opacity: 0.5, fontStyle: 'italic' }}>
                                                                    No description
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', opacity: line.project_name ? 1 : 0.5 }}>
                                                            {line.project_name || <em>No project</em>}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500 }}>
                                                            {formatQuantity(line.total_minutes)}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                            {formatCurrency(line.hourly_rate_cents)}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--secondary)' }}>
                                                            {line.discount_cents > 0 ? `-${formatCurrency(line.discount_cents)}` : formatCurrency(0)}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                                            {formatCurrency(line.amount_cents)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot style={{ background: 'rgba(255,255,255,0.05)', borderTop: '2px solid var(--border)' }}>
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>Total:</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(preview.total_cents)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Invoice Details */}
                                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                                        <div className="flex flex-col gap-2">
                                            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Invoice # *</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.invoice_number}
                                                onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                                                className="glass"
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    outline: 'none',
                                                    background: 'var(--card-bg)',
                                                    color: 'inherit'
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Invoice Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.invoice_date}
                                                onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                                                className="glass"
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    outline: 'none',
                                                    background: 'var(--card-bg)',
                                                    color: 'inherit'
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Due Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.due_date}
                                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                                className="glass"
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    outline: 'none',
                                                    background: 'var(--card-bg)',
                                                    color: 'inherit'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer style={{
                            padding: '1.5rem',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '1rem',
                            background: 'var(--background)'
                        }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || previewLoading || !preview || preview.lines.length === 0 || !formData.invoice_number}
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Invoice'}
                            </button>
                        </footer>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateInvoiceFromTimeEntriesModal;



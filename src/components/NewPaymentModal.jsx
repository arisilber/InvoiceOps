import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, DollarSign, Plus, Trash2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const NewPaymentModal = ({ isOpen, onClose, onPaymentCreated }) => {
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [applications, setApplications] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchInvoices();
            // Reset form
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setAmount('');
            setNote('');
            setApplications([]);
            setError(null);
        }
    }, [isOpen]);

    const fetchInvoices = async () => {
        try {
            setLoadingInvoices(true);
            const data = await api.getInvoices();
            // Filter to only show invoices that aren't fully paid
            const unpaidInvoices = data.filter(inv =>
                inv.status !== 'paid' && inv.status !== 'voided'
            );
            setInvoices(unpaidInvoices);
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError('Failed to load invoices.');
        } finally {
            setLoadingInvoices(false);
        }
    };

    const addApplication = () => {
        setApplications([...applications, { invoice_id: '', amount: '' }]);
    };

    const removeApplication = (index) => {
        setApplications(applications.filter((_, i) => i !== index));
    };

    const updateApplication = (index, field, value) => {
        const updated = [...applications];
        updated[index][field] = value;
        setApplications(updated);
    };

    const getTotalApplied = () => {
        return applications.reduce((sum, app) => {
            const appAmount = parseFloat(app.amount) || 0;
            return sum + appAmount;
        }, 0);
    };

    const getUnappliedAmount = () => {
        const paymentAmount = parseFloat(amount) || 0;
        const totalApplied = getTotalApplied();
        return paymentAmount - totalApplied;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!paymentDate || !amount) {
            setError('Please fill in all required fields.');
            return;
        }

        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setError('Please enter a valid payment amount.');
            return;
        }

        const totalApplied = getTotalApplied();
        if (totalApplied > paymentAmount) {
            setError('Total applied amount cannot exceed payment amount.');
            return;
        }

        // Validate applications
        for (const app of applications) {
            if (!app.invoice_id) {
                setError('Please select an invoice for all applications.');
                return;
            }
            const appAmount = parseFloat(app.amount);
            if (isNaN(appAmount) || appAmount <= 0) {
                setError('Please enter valid amounts for all applications.');
                return;
            }
        }

        try {
            setLoading(true);

            const paymentData = {
                payment_date: paymentDate,
                amount_cents: Math.round(paymentAmount * 100),
                note: note || null,
                applications: applications.map(app => ({
                    invoice_id: parseInt(app.invoice_id),
                    amount_cents: Math.round(parseFloat(app.amount) * 100)
                }))
            };

            await api.createPayment(paymentData);
            onPaymentCreated();
        } catch (err) {
            console.error('Error creating payment:', err);
            setError(err.message || 'Failed to create payment. Please try again.');
        } finally {
            setLoading(false);
        }
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
                        maxWidth: '700px',
                        maxHeight: '90vh',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1.5rem 2rem',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                padding: '0.5rem',
                                background: 'var(--primary)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <DollarSign size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>New Payment</h2>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                opacity: 0.7,
                                transition: 'opacity 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{
                        padding: '2rem',
                        overflowY: 'auto',
                        flex: 1
                    }}>
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#ef4444',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            {/* Payment Details */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    Payment Details
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                            Payment Date <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            required
                                            className="glass"
                                            style={{
                                                width: '100%',
                                                padding: '0.625rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)',
                                                background: 'var(--card-bg)',
                                                color: 'inherit',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                            Payment Amount <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute',
                                                left: '1rem',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                opacity: 0.7
                                            }}>$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                required
                                                className="glass"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.625rem 1rem 0.625rem 2rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--card-bg)',
                                                    color: 'inherit',
                                                    fontSize: '0.875rem'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                                        Note (Optional)
                                    </label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add any notes about this payment..."
                                        className="glass"
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            background: 'var(--card-bg)',
                                            color: 'inherit',
                                            fontSize: '0.875rem',
                                            minHeight: '80px',
                                            resize: 'vertical',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Invoice Applications */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                        Apply to Invoices
                                    </h3>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={addApplication}
                                        disabled={loadingInvoices || invoices.length === 0}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        <Plus size={16} />
                                        Add Invoice
                                    </button>
                                </div>

                                {loadingInvoices ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                                        <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} />
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Loading invoices...</div>
                                    </div>
                                ) : invoices.length === 0 ? (
                                    <div style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        background: 'var(--glass-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        opacity: 0.7
                                    }}>
                                        No unpaid invoices available to apply payment to.
                                    </div>
                                ) : applications.length === 0 ? (
                                    <div style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        background: 'var(--glass-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        opacity: 0.7
                                    }}>
                                        Click "Add Invoice" to apply this payment to one or more invoices.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {applications.map((app, index) => (
                                            <div key={index} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr auto',
                                                gap: '0.75rem',
                                                padding: '1rem',
                                                background: 'var(--glass-bg)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)'
                                            }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                                                        Invoice
                                                    </label>
                                                    <select
                                                        value={app.invoice_id}
                                                        onChange={(e) => updateApplication(index, 'invoice_id', e.target.value)}
                                                        required
                                                        className="glass"
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.625rem 1rem',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--card-bg)',
                                                            color: 'inherit',
                                                            fontSize: '0.875rem'
                                                        }}
                                                    >
                                                        <option value="">Select invoice...</option>
                                                        {invoices.map(invoice => (
                                                            <option key={invoice.id} value={invoice.id}>
                                                                INV-{invoice.invoice_number} - {invoice.client_name} - ${(invoice.total_cents / 100).toFixed(2)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                                                        Amount
                                                    </label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{
                                                            position: 'absolute',
                                                            left: '1rem',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            opacity: 0.7,
                                                            fontSize: '0.875rem'
                                                        }}>$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={app.amount}
                                                            onChange={(e) => updateApplication(index, 'amount', e.target.value)}
                                                            placeholder="0.00"
                                                            required
                                                            className="glass"
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.625rem 1rem 0.625rem 2rem',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--border)',
                                                                background: 'var(--card-bg)',
                                                                color: 'inherit',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => removeApplication(index)}
                                                        style={{ padding: '0.625rem', color: '#ef4444' }}
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Summary */}
                                {amount && applications.length > 0 && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        background: 'var(--glass-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                            <span style={{ opacity: 0.7 }}>Payment Amount:</span>
                                            <span style={{ fontWeight: 600 }}>${parseFloat(amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                            <span style={{ opacity: 0.7 }}>Total Applied:</span>
                                            <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>${getTotalApplied().toFixed(2)}</span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            paddingTop: '0.5rem',
                                            borderTop: '1px solid var(--border)',
                                            fontSize: '0.875rem'
                                        }}>
                                            <span style={{ fontWeight: 600 }}>Unapplied:</span>
                                            <span style={{
                                                fontWeight: 600,
                                                color: getUnappliedAmount() > 0 ? 'var(--accent)' : 'inherit'
                                            }}>
                                                ${getUnappliedAmount().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '1rem',
                                paddingTop: '1.5rem',
                                borderTop: '1px solid var(--border)'
                            }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign size={18} />
                                            Create Payment
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewPaymentModal;

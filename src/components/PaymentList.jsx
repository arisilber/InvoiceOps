import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Loader2, Trash2, Eye, AlertTriangle, DollarSign, PlusCircle, X } from 'lucide-react';
import api from '../services/api';
import NewPaymentModal from './NewPaymentModal';

const PaymentList = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'fully_applied', 'partially_applied', 'unapplied'
    const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, []);

    // Close filter menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setFilterMenuOpen(false);
        if (filterMenuOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [filterMenuOpen]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const data = await api.getPayments();
            setPayments(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching payments:', err);
            setError('Failed to load payments.');
        } finally {
            setLoading(false);
        }
    };

    const getPaymentStatus = (payment) => {
        const appliedAmount = parseInt(payment.applied_amount_cents || 0);
        const totalAmount = parseInt(payment.amount_cents);
        const unappliedAmount = totalAmount - appliedAmount;

        if (unappliedAmount === 0 && appliedAmount > 0) return 'fully_applied';
        if (appliedAmount > 0 && unappliedAmount > 0) return 'partially_applied';
        return 'unapplied';
    };

    const filteredPayments = payments.filter(payment => {
        // Search filter
        const searchLower = searchTerm.toLowerCase();
        const paymentDate = new Date(payment.payment_date).toLocaleDateString();
        const amount = (payment.amount_cents / 100).toFixed(2);
        const note = payment.note || '';
        const clientNames = payment.client_names || '';

        const matchesSearch = paymentDate.includes(searchLower) ||
            amount.includes(searchLower) ||
            note.toLowerCase().includes(searchLower) ||
            clientNames.toLowerCase().includes(searchLower);

        // Status filter
        const status = getPaymentStatus(payment);
        const matchesStatus = filterStatus === 'all' || filterStatus === status;

        return matchesSearch && matchesStatus;
    });

    const handleDeleteClick = (payment) => {
        setPaymentToDelete(payment);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!paymentToDelete) return;

        try {
            setDeleting(true);
            await api.deletePayment(paymentToDelete.id);
            setPayments(payments.filter(payment => payment.id !== paymentToDelete.id));
            setDeleteModalOpen(false);
            setPaymentToDelete(null);
        } catch (err) {
            console.error('Error deleting payment:', err);
            setError('Failed to delete payment. Please try again.');
            setDeleteModalOpen(false);
            setPaymentToDelete(null);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setPaymentToDelete(null);
    };

    const handleViewDetails = async (payment) => {
        try {
            const fullPayment = await api.getPayment(payment.id);
            setSelectedPayment(fullPayment);
            setDetailModalOpen(true);
        } catch (err) {
            console.error('Error fetching payment details:', err);
            setError('Failed to load payment details.');
        }
    };

    const handlePaymentCreated = () => {
        fetchPayments();
        setIsNewPaymentModalOpen(false);
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
            <header style={{
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
                    }}>Payments</h1>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        fontWeight: '400'
                    }}>Track and manage all client payments.</p>
                </div>
                <div className="flex gap-2">
                    <div className="glass flex items-center gap-2" style={{ padding: '0 1rem', borderRadius: 'var(--radius-md)' }}>
                        <Search size={18} style={{ opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Search payments..."
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
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    opacity: 0.7,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button
                            className={`btn btn-secondary ${filterStatus !== 'all' ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFilterMenuOpen(!filterMenuOpen);
                            }}
                        >
                            <Filter size={18} />
                            Filter
                            {filterStatus !== 'all' && (
                                <span style={{
                                    marginLeft: '0.5rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                }}>1</span>
                            )}
                        </button>
                        <AnimatePresence>
                            {filterMenuOpen && (
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
                                        border: '1px solid var(--border)',
                                        zIndex: 10,
                                        minWidth: '200px',
                                        overflow: 'hidden'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ padding: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, padding: '0.5rem', textTransform: 'uppercase' }}>
                                            Status
                                        </div>
                                        {[
                                            { value: 'all', label: 'All Payments' },
                                            { value: 'fully_applied', label: 'Fully Applied' },
                                            { value: 'partially_applied', label: 'Partially Applied' },
                                            { value: 'unapplied', label: 'Unapplied' }
                                        ].map(option => (
                                            <button
                                                key={option.value}
                                                className="btn-menu-item"
                                                onClick={() => {
                                                    setFilterStatus(option.value);
                                                    setFilterMenuOpen(false);
                                                }}
                                                style={{
                                                    background: filterStatus === option.value ? 'var(--ring)' : 'transparent',
                                                    fontWeight: filterStatus === option.value ? 600 : 400
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button
                        onClick={() => setIsNewPaymentModalOpen(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                    >
                        <PlusCircle size={16} />
                        New Payment
                    </button>
                </div>
            </header>

            {error && (
                <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
                    {error}
                </div>
            )}

            {!error && filteredPayments.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <DollarSign size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <div style={{ opacity: 0.5, marginBottom: '0.5rem' }}>
                        {payments.length === 0 
                            ? 'No payments found.' 
                            : `No payments match your ${searchTerm ? 'search' : 'filter'} criteria.`}
                    </div>
                    {payments.length === 0 ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsNewPaymentModalOpen(true)}
                            style={{ marginTop: '1rem' }}
                        >
                            <PlusCircle size={18} />
                            Add Your First Payment
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                            {searchTerm && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSearchTerm('')}
                                >
                                    Clear Search
                                </button>
                            )}
                            {filterStatus !== 'all' && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setFilterStatus('all')}
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!error && filteredPayments.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Client</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Amount</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Applied</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Unapplied</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Note</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map((payment, index) => {
                                const appliedAmount = parseInt(payment.applied_amount_cents || 0);
                                const totalAmount = parseInt(payment.amount_cents);
                                const unappliedAmount = totalAmount - appliedAmount;
                                const status = getPaymentStatus(payment);

                                const getStatusBadge = () => {
                                    const statusConfig = {
                                        fully_applied: { label: 'Fully Applied', color: 'var(--secondary)', bg: 'rgba(34, 197, 94, 0.1)' },
                                        partially_applied: { label: 'Partially Applied', color: 'var(--accent)', bg: 'rgba(251, 191, 36, 0.1)' },
                                        unapplied: { label: 'Unapplied', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
                                    };
                                    const config = statusConfig[status] || statusConfig.unapplied;
                                    return (
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: config.bg,
                                            color: config.color
                                        }}>
                                            {config.label}
                                        </span>
                                    );
                                };

                                return (
                                    <tr key={payment.id} style={{
                                        borderBottom: index !== filteredPayments.length - 1 ? '1px solid var(--border)' : 'none',
                                        transition: 'background 0.2s ease'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1rem 1.5rem', opacity: 0.7 }}>
                                            {new Date(payment.payment_date).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                                            {payment.client_names || '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                                            ${(totalAmount / 100).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--secondary)' }}>
                                            ${(appliedAmount / 100).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: unappliedAmount > 0 ? 'var(--accent)' : 'inherit' }}>
                                            ${(unappliedAmount / 100).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {getStatusBadge()}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', opacity: 0.7, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {payment.note || '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem' }}
                                                    onClick={() => handleViewDetails(payment)}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem', color: '#ef4444' }}
                                                    onClick={() => handleDeleteClick(payment)}
                                                    title="Delete Payment"
                                                    disabled={deleting}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* New Payment Modal */}
            <NewPaymentModal
                isOpen={isNewPaymentModalOpen}
                onClose={() => setIsNewPaymentModalOpen(false)}
                onPaymentCreated={handlePaymentCreated}
            />

            {/* Payment Details Modal */}
            <AnimatePresence>
                {detailModalOpen && selectedPayment && (
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
                    }} onClick={() => setDetailModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                background: 'var(--background)',
                                width: '100%',
                                maxWidth: '600px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                overflow: 'hidden'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ padding: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                    Payment Details
                                </h2>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Date</div>
                                            <div style={{ fontWeight: 600 }}>{new Date(selectedPayment.payment_date).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Total Amount</div>
                                            <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)' }}>
                                                ${(selectedPayment.amount_cents / 100).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedPayment.note && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.25rem' }}>Note</div>
                                            <div>{selectedPayment.note}</div>
                                        </div>
                                    )}
                                </div>

                                {selectedPayment.applications && selectedPayment.applications.length > 0 ? (
                                    <>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                                            Applied to Invoices
                                        </h3>
                                        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)' }}>
                                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'left', fontSize: '0.875rem' }}>Invoice</th>
                                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'left', fontSize: '0.875rem' }}>Client</th>
                                                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right', fontSize: '0.875rem' }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPayment.applications.map((app, index) => (
                                                        <tr key={app.id} style={{
                                                            borderBottom: index !== selectedPayment.applications.length - 1 ? '1px solid var(--border)' : 'none'
                                                        }}>
                                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                                                                INV-{app.invoice_number}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', opacity: 0.7 }}>
                                                                {app.client_name}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, textAlign: 'right' }}>
                                                                ${(app.amount_cents / 100).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        background: 'var(--glass-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        opacity: 0.7
                                    }}>
                                        This payment has not been applied to any invoices yet.
                                    </div>
                                )}

                                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setDetailModalOpen(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                borderRadius: 'var(--radius-md)',
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
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Delete Payment</h2>
                                </div>
                                <p style={{ marginBottom: '2rem', opacity: 0.8, lineHeight: 1.6 }}>
                                    Are you sure you want to delete this payment of <strong>${(paymentToDelete?.amount_cents / 100).toFixed(2)}</strong>? This action cannot be undone and will remove all associated invoice applications.
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
                                            'Delete Payment'
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

export default PaymentList;

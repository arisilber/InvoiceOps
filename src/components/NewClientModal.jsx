import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, DollarSign, Percent, Briefcase, Loader2 } from 'lucide-react';
import api from '../services/api';

const NewClientModal = ({ isOpen, onClose, onClientAdded, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        type: initialData?.type || 'company',
        hourly_rate: initialData ? (initialData.hourly_rate_cents / 100).toFixed(2) : 100,
        discount_percent: initialData?.discount_percent || 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Update form data if initialData changes (e.g. when opening for a different client)
    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                type: initialData.type,
                hourly_rate: (initialData.hourly_rate_cents / 100).toFixed(2),
                discount_percent: initialData.discount_percent
            });
        } else {
            setFormData({
                name: '',
                email: '',
                type: 'company',
                hourly_rate: 100,
                discount_percent: 0
            });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            // Basic validation
            if (!formData.name || !formData.email) {
                throw new Error('Name and email are required');
            }

            const clientPayload = {
                name: formData.name,
                email: formData.email,
                type: formData.type,
                hourly_rate_cents: Math.round(parseFloat(formData.hourly_rate) * 100),
                discount_percent: parseFloat(formData.discount_percent)
            };

            if (initialData?.id) {
                await api.updateClient(initialData.id, clientPayload);
            } else {
                await api.createClient(clientPayload);
            }

            onClientAdded();
            onClose();
            // Reset form
            if (!initialData) {
                setFormData({
                    name: '',
                    email: '',
                    type: 'company',
                    hourly_rate: 100,
                    discount_percent: 0
                });
            }
        } catch (err) {
            console.error(initialData ? 'Error updating client:' : 'Error creating client:', err);
            setError(err.message || `Failed to ${initialData ? 'update' : 'create'} client`);
        } finally {
            setLoading(false);
        }
    };

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
                        maxWidth: '600px',
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
                        <h2 style={{ fontSize: '1.5rem' }}>{initialData ? 'Edit Client' : 'Add New Client'}</h2>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </header>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            <div className="flex flex-col gap-5">
                                {error && (
                                    <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)', padding: '1rem' }}>
                                        {error}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Client Name</label>
                                    <div className="glass flex items-center gap-2" style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                        <User size={18} style={{ opacity: 0.5 }} />
                                        <input
                                            type="text"
                                            placeholder="e.g. Acme Corp"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            style={{
                                                padding: '0.75rem 0',
                                                background: 'none',
                                                border: 'none',
                                                outline: 'none',
                                                width: '100%',
                                                color: 'inherit'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="flex flex-col gap-2">
                                        <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Email Address</label>
                                        <div className="glass flex items-center gap-2" style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                            <Mail size={18} style={{ opacity: 0.5 }} />
                                            <input
                                                type="email"
                                                placeholder="billing@company.com"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                style={{
                                                    padding: '0.75rem 0',
                                                    background: 'none',
                                                    border: 'none',
                                                    outline: 'none',
                                                    width: '100%',
                                                    color: 'inherit'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Client Type</label>
                                        <div className="glass flex items-center gap-2" style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                            <Briefcase size={18} style={{ opacity: 0.5 }} />
                                            <select
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                style={{
                                                    padding: '0.75rem 0',
                                                    background: 'none',
                                                    border: 'none',
                                                    outline: 'none',
                                                    width: '100%',
                                                    color: 'inherit',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="company">Company</option>
                                                <option value="individual">Individual</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="flex flex-col gap-2">
                                        <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Hourly Rate ($)</label>
                                        <div className="glass flex items-center gap-2" style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                            <DollarSign size={18} style={{ opacity: 0.5 }} />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="100.00"
                                                required
                                                value={formData.hourly_rate}
                                                onChange={e => setFormData({ ...formData, hourly_rate: e.target.value })}
                                                style={{
                                                    padding: '0.75rem 0',
                                                    background: 'none',
                                                    border: 'none',
                                                    outline: 'none',
                                                    width: '100%',
                                                    color: 'inherit'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Discount (%)</label>
                                        <div className="glass flex items-center gap-2" style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                            <Percent size={18} style={{ opacity: 0.5 }} />
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={formData.discount_percent}
                                                onChange={e => setFormData({ ...formData, discount_percent: e.target.value })}
                                                style={{
                                                    padding: '0.75rem 0',
                                                    background: 'none',
                                                    border: 'none',
                                                    outline: 'none',
                                                    width: '100%',
                                                    color: 'inherit'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : (initialData ? 'Update Client' : 'Save Client')}
                            </button>
                        </footer>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewClientModal;

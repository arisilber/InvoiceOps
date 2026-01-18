import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import api from '../services/api';

const NewInvoiceModal = ({ isOpen, onClose, onInvoiceCreated }) => {
    const [clients, setClients] = useState([]);
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialDataLoading, setInitialDataLoading] = useState(false);

    const [formData, setFormData] = useState({
        invoice_number: '',
        client_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        lines: [
            { work_type_id: '', project_name: '', hours: 0, hourly_rate: 0 }
        ]
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            // Fetch the next sequential invoice number
            const fetchNextInvoiceNumber = async () => {
                try {
                    const nextNumber = await api.getNextInvoiceNumber();
                    setFormData(prev => ({
                        ...prev,
                        invoice_number: nextNumber.toString()
                    }));
                } catch (err) {
                    console.error('Error fetching next invoice number:', err);
                }
            };
            fetchNextInvoiceNumber();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            setInitialDataLoading(true);
            const [clientsData, workTypesData] = await Promise.all([
                api.getClients(),
                api.getWorkTypes()
            ]);
            setClients(clientsData);
            setWorkTypes(workTypesData);

            if (workTypesData.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    lines: prev.lines.map(line => ({ ...line, work_type_id: workTypesData[0].id }))
                }));
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        } finally {
            setInitialDataLoading(false);
        }
    };

    const handleAddLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { work_type_id: workTypes[0]?.id || '', project_name: '', hours: 0, hourly_rate: 0 }]
        });
    };

    const handleRemoveLine = (index) => {
        setFormData({
            ...formData,
            lines: formData.lines.filter((_, i) => i !== index)
        });
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...formData.lines];
        newLines[index][field] = value;
        setFormData({ ...formData, lines: newLines });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const subtotal_cents = formData.lines.reduce((acc, line) => {
                return acc + Math.round(line.hours * line.hourly_rate * 100);
            }, 0);

            const invoiceData = {
                ...formData,
                invoice_number: parseInt(formData.invoice_number),
                client_id: parseInt(formData.client_id),
                subtotal_cents,
                total_cents: subtotal_cents, // Assuming no discount for now
                discount_cents: 0,
                lines: formData.lines.map(line => ({
                    work_type_id: parseInt(line.work_type_id),
                    project_name: line.project_name,
                    total_minutes: Math.round(line.hours * 60),
                    hourly_rate_cents: Math.round(parseFloat(line.hourly_rate) * 100),
                    amount_cents: Math.round(line.hours * line.hourly_rate * 100)
                }))
            };

            await api.createInvoice(invoiceData);
            onInvoiceCreated();
            onClose();
        } catch (err) {
            console.error('Error creating invoice:', err);
            alert(err.message || 'Failed to create invoice');
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
                        maxWidth: '800px',
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
                        <h2 style={{ fontSize: '1.5rem' }}>Create New Invoice</h2>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </header>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="flex flex-col gap-2">
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Invoice #</label>
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
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Bill To</label>
                                    <select
                                        required
                                        value={formData.client_id}
                                        onChange={e => {
                                            const clientId = e.target.value;
                                            const client = clients.find(c => c.id === parseInt(clientId));
                                            setFormData({
                                                ...formData,
                                                client_id: clientId,
                                                lines: formData.lines.map(line => ({
                                                    ...line,
                                                    hourly_rate: (client?.hourly_rate_cents || 0) / 100
                                                }))
                                            });
                                        }}
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
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Invoice Date</label>
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
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Items</h3>
                                <div className="flex flex-col gap-3">
                                    {formData.lines.map((line, index) => (
                                        <div key={index} className="flex gap-4 items-end">
                                            <div style={{ flex: 2 }} className="flex flex-col gap-2">
                                                <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Work Type</label>
                                                <select
                                                    value={line.work_type_id}
                                                    onChange={e => handleLineChange(index, 'work_type_id', e.target.value)}
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card-bg)',
                                                        color: 'inherit',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    {workTypes.map(wt => (
                                                        <option key={wt.id} value={wt.id}>{wt.description}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ flex: 3 }} className="flex flex-col gap-2">
                                                <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Project/Description</label>
                                                <input
                                                    type="text"
                                                    placeholder="Item description"
                                                    required
                                                    value={line.project_name}
                                                    onChange={e => handleLineChange(index, 'project_name', e.target.value)}
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card-bg)',
                                                        color: 'inherit',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }} className="flex flex-col gap-2">
                                                <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Hours</label>
                                                <input
                                                    type="number"
                                                    step="0.25"
                                                    required
                                                    value={line.hours}
                                                    onChange={e => handleLineChange(index, 'hours', parseFloat(e.target.value) || 0)}
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card-bg)',
                                                        color: 'inherit',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ flex: 2 }} className="flex flex-col gap-2">
                                                <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>Rate ($)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={line.hourly_rate}
                                                    onChange={e => handleLineChange(index, 'hourly_rate', parseFloat(e.target.value) || 0)}
                                                    style={{
                                                        padding: '0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card-bg)',
                                                        color: 'inherit',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLine(index)}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.75rem', color: '#ef4444' }}
                                                disabled={formData.lines.length === 1}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddLine}
                                    className="btn btn-secondary"
                                    style={{ marginTop: '1rem', width: '100%', borderStyle: 'dashed' }}
                                >
                                    <Plus size={18} />
                                    Add Item
                                </button>
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
                            <button type="submit" className="btn btn-primary" disabled={loading || initialDataLoading}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Invoice'}
                            </button>
                        </footer>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewInvoiceModal;

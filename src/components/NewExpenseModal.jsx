import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import api from '../services/api';

const NewExpenseModal = ({ isOpen, onClose, onExpenseCreated, initialData = null, isRefund = false }) => {
    const [loading, setLoading] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [formData, setFormData] = useState({
        vendor: '',
        item: '',
        price_cents: '',
        quantity: 1,
        expense_date: new Date().toISOString().split('T')[0],
    });
    const previousItemRef = useRef('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit mode
                const price = initialData.price_cents ? Math.abs(initialData.price_cents / 100).toFixed(2) : '';
                setFormData({
                    vendor: initialData.vendor || '',
                    item: initialData.item || '',
                    price_cents: price,
                    quantity: initialData.quantity || 1,
                    expense_date: initialData.expense_date || new Date().toISOString().split('T')[0],
                });
                previousItemRef.current = initialData.item || '';
            } else {
                // New expense/refund mode
                setFormData({
                    vendor: '',
                    item: '',
                    price_cents: '',
                    quantity: 1,
                    expense_date: new Date().toISOString().split('T')[0],
                });
                previousItemRef.current = '';
            }
        }
    }, [isOpen, initialData, isRefund]);

    // Fetch unique vendors and items when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchUniqueValues = async () => {
                try {
                    const [vendorsData, itemsData] = await Promise.all([
                        api.getUniqueVendors(),
                        api.getUniqueItems()
                    ]);
                    setVendors(vendorsData);
                    setItems(itemsData);
                } catch (err) {
                    console.error('Error fetching unique values:', err);
                    // Silently fail - this is a convenience feature
                }
            };
            fetchUniqueValues();
        }
    }, [isOpen]);

    // Watch for item changes and prefill price from previous expense
    useEffect(() => {
        // Only fetch previous price if:
        // 1. Modal is open
        // 2. Not in edit mode (no initialData)
        // 3. Item field has a value and has changed
        // 4. Price field is empty (don't overwrite user input)
        const currentItem = formData.item.trim();
        const itemChanged = currentItem && currentItem !== previousItemRef.current;
        
        if (isOpen && !initialData && itemChanged && !formData.price_cents) {
            previousItemRef.current = currentItem;
            
            const fetchPreviousPrice = async () => {
                try {
                    const result = await api.getPreviousExpensePrice(currentItem);
                    if (result.price_cents !== null) {
                        // Only prefill if price field is still empty (user hasn't typed anything)
                        setFormData(prev => {
                            if (!prev.price_cents) {
                                return {
                                    ...prev,
                                    price_cents: (result.price_cents / 100).toFixed(2)
                                };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    // Silently fail - this is a convenience feature
                    console.error('Error fetching previous price:', err);
                }
            };

            // Debounce the API call slightly to avoid too many requests while typing
            const timeoutId = setTimeout(fetchPreviousPrice, 500);
            return () => clearTimeout(timeoutId);
        } else if (currentItem) {
            // Update ref even if we don't fetch (to track changes)
            previousItemRef.current = currentItem;
        }
    }, [isOpen, initialData, formData.item, formData.price_cents]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);

            const currentIsRefund = initialData ? initialData.is_refund : isRefund;
            const priceValue = parseFloat(formData.price_cents);
            
            // For refunds, store as negative; for expenses, store as positive
            const price_cents = currentIsRefund 
                ? -Math.round(priceValue * 100) 
                : Math.round(priceValue * 100);

            const expenseData = {
                vendor: formData.vendor.trim(),
                item: formData.item.trim(),
                price_cents: price_cents,
                quantity: parseFloat(formData.quantity),
                expense_date: formData.expense_date,
                is_refund: currentIsRefund,
            };

            if (initialData) {
                // Update existing expense
                await api.updateExpense(initialData.id, expenseData);
            } else {
                // Create new expense/refund
                await api.createExpense(expenseData);
            }

            onExpenseCreated();
            onClose();
        } catch (err) {
            console.error('Error saving expense:', err);
            alert(err.message || 'Failed to save expense');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalAmount = formData.price_cents && formData.quantity 
        ? (parseFloat(formData.price_cents) * parseFloat(formData.quantity)).toFixed(2)
        : '0.00';

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
                        <h2 style={{ fontSize: '1.5rem' }}>
                            {initialData 
                                ? (initialData.is_refund ? 'Edit Refund' : 'Edit Expense')
                                : (isRefund ? 'New Refund' : 'New Expense')
                            }
                        </h2>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </header>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="flex flex-col gap-2">
                                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Vendor *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        list="vendors-list"
                                        required
                                        value={formData.vendor}
                                        onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                        className="glass"
                                        placeholder="Enter vendor name"
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            outline: 'none',
                                            background: 'var(--card-bg)',
                                            color: 'inherit',
                                            width: '100%'
                                        }}
                                    />
                                    {vendors.length > 0 && (
                                        <datalist id="vendors-list">
                                            {vendors.map((vendor, index) => (
                                                <option key={index} value={vendor} />
                                            ))}
                                        </datalist>
                                    )}
                                </div>
                                {vendors.length > 0 && (
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                        Select from previous vendors or type a new vendor name
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Item *</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        list="items-list"
                                        required
                                        value={formData.item}
                                        onChange={e => setFormData({ ...formData, item: e.target.value })}
                                        className="glass"
                                        placeholder="Enter item description"
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            outline: 'none',
                                            background: 'var(--card-bg)',
                                            color: 'inherit',
                                            width: '100%'
                                        }}
                                    />
                                    {items.length > 0 && (
                                        <datalist id="items-list">
                                            {items.map((item, index) => (
                                                <option key={index} value={item} />
                                            ))}
                                        </datalist>
                                    )}
                                </div>
                                {items.length > 0 && (
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                        Select from previous items or type a new item description
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="flex flex-col gap-2">
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                        {initialData?.is_refund || isRefund ? 'Refund Amount ($) *' : 'Price ($) *'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={formData.price_cents}
                                        onChange={e => setFormData({ ...formData, price_cents: e.target.value })}
                                        className="glass"
                                        placeholder="0.00"
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
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Quantity *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                        className="glass"
                                        placeholder="1"
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

                            <div className="flex flex-col gap-2">
                                <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.expense_date}
                                    onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
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

                            <div style={{
                                padding: '1rem',
                                background: 'var(--card-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Total:</span>
                                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                    ${totalAmount}
                                </span>
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
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                                        {initialData ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    initialData 
                                        ? (initialData.is_refund ? 'Update Refund' : 'Update Expense')
                                        : (isRefund ? 'Create Refund' : 'Create Expense')
                                )}
                            </button>
                        </footer>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewExpenseModal;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign,
    Search,
    Filter,
    Calendar as CalendarIcon,
    Edit2,
    Trash2,
    Plus,
    X,
    Loader2,
    AlertCircle,
    TrendingUp,
    Store,
    LayoutGrid,
    List,
    RotateCcw,
    BarChart3,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import api from '../services/api';
import NewExpenseModal from './NewExpenseModal';

const ExpenseList = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRefundModal, setIsRefundModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showMonthlyView, setShowMonthlyView] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState(new Set());

    // Filters
    const [filters, setFilters] = useState({
        vendor: '',
        expense_date_from: '',
        expense_date_to: '',
        is_refund: undefined,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [expensesData, statsData] = await Promise.all([
                api.getExpenses(filters),
                api.getExpenseStats(filters)
            ]);
            
            setExpenses(expensesData);
            setStats(statsData);
            setError(null);
        } catch (err) {
            console.error('Error fetching expenses:', err);
            setError('Failed to load expenses. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleDelete = async (id) => {
        const expense = expenses.find(e => e.id === id);
        const itemType = expense?.is_refund ? 'refund' : 'expense';
        if (!window.confirm(`Are you sure you want to delete this ${itemType}?`)) return;

        try {
            await api.deleteExpense(id);
            setExpenses(expenses.filter(e => e.id !== id));
            fetchData(); // Refresh stats
        } catch (err) {
            alert('Failed to delete expense');
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingExpense(null);
        setIsRefundModal(false);
        setIsModalOpen(true);
    };

    const handleAddRefund = () => {
        setEditingExpense(null);
        setIsRefundModal(true);
        setIsModalOpen(true);
    };

    const handleExpenseCreated = () => {
        fetchData();
    };

    const formatCurrency = (cents) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const clearFilters = () => {
        setFilters({
            vendor: '',
            expense_date_from: '',
            expense_date_to: '',
            is_refund: undefined,
        });
    };

    const hasActiveFilters = filters.vendor || filters.expense_date_from || filters.expense_date_to || filters.is_refund !== undefined;

    // Calculate monthly summary from filtered expenses
    const getMonthlySummary = () => {
        const monthlyTotals = {};
        expenses.forEach(expense => {
            if (!expense.expense_date) return;
            const date = new Date(expense.expense_date);
            if (isNaN(date.getTime())) return; // Skip invalid dates
            
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyTotals[monthKey]) {
                monthlyTotals[monthKey] = {
                    month: monthKey,
                    total_cents: 0,
                    count: 0
                };
            }
            // Ensure we convert to number and handle null/undefined
            const totalCents = Number(expense.total_cents) || 0;
            monthlyTotals[monthKey].total_cents += totalCents;
            monthlyTotals[monthKey].count += 1;
        });

        // Convert to array and sort by month (newest first)
        return Object.values(monthlyTotals)
            .sort((a, b) => b.month.localeCompare(a.month));
    };

    const monthlySummary = getMonthlySummary();
    const totalMonthlyAmount = monthlySummary.reduce((sum, month) => {
        const monthTotal = Number(month.total_cents) || 0;
        return sum + monthTotal;
    }, 0);

    const formatMonthLabel = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    const toggleMonthExpansion = (monthKey) => {
        setExpandedMonths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(monthKey)) {
                newSet.delete(monthKey);
            } else {
                newSet.add(monthKey);
            }
            return newSet;
        });
    };

    const getExpensesForMonth = (monthKey) => {
        return expenses.filter(expense => {
            if (!expense.expense_date) return false;
            const date = new Date(expense.expense_date);
            if (isNaN(date.getTime())) return false;
            const expenseMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return expenseMonthKey === monthKey;
        }).sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    };

    if (loading && expenses.length === 0) {
        return (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Business Expenses</h1>
                    <p style={{ opacity: 0.7 }}>Track and manage your business expenses</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--foreground)', opacity: 0.6 }}>View:</span>
                        <div style={{ 
                            display: 'flex', 
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: 'var(--background)'
                        }}>
                            <button
                                onClick={() => setShowMonthlyView(false)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: 'none',
                                    background: showMonthlyView ? 'transparent' : 'var(--foreground)',
                                    color: showMonthlyView ? 'var(--foreground)' : 'var(--background)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    transition: 'background-color 0.15s ease',
                                    fontFamily: 'var(--font-sans)'
                                }}
                            >
                                <List size={14} />
                                Detailed
                            </button>
                            <button
                                onClick={() => setShowMonthlyView(true)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: 'none',
                                    borderLeft: '1px solid var(--border)',
                                    background: showMonthlyView ? 'var(--foreground)' : 'transparent',
                                    color: showMonthlyView ? 'var(--background)' : 'var(--foreground)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    transition: 'background-color 0.15s ease',
                                    fontFamily: 'var(--font-sans)'
                                }}
                            >
                                <LayoutGrid size={14} />
                                Monthly
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleAddRefund}
                            className="btn btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem'
                            }}
                        >
                            <RotateCcw size={18} />
                            New Refund
                        </button>
                        <button
                            onClick={handleAdd}
                            className="btn btn-primary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem'
                            }}
                        >
                            <Plus size={18} />
                            New Expense
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <DollarSign size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Total Expenses</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {stats.total_expenses || 0}
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <RotateCcw size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Total Refunds</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {stats.total_refunds || 0}
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <TrendingUp size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Gross Expenses</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.total_expenses_amount_cents || 0)}
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <RotateCcw size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Refund Amount</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                            {formatCurrency(Math.abs(stats.total_refunds_amount_cents || 0))}
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '2px solid var(--foreground)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <DollarSign size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Net Expenses</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.net_amount_cents || 0)}
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Store size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Unique Vendors</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {stats.unique_vendors || 0}
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <BarChart3 size={20} style={{ opacity: 0.7 }} />
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Avg Expense Amount</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.average_expense_amount_cents || 0)}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn btn-secondary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: showFilters ? '1rem' : 0
                    }}
                >
                    <Filter size={18} />
                    Filters
                    {hasActiveFilters && (
                        <span style={{
                            background: 'var(--foreground)',
                            color: 'var(--background)',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            marginLeft: '0.25rem'
                        }}>
                            {[filters.vendor, filters.expense_date_from, filters.expense_date_to, filters.is_refund !== undefined ? 'type' : null].filter(Boolean).length}
                        </span>
                    )}
                </button>

                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            padding: '1.5rem',
                            background: 'var(--card-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1rem'
                        }}
                    >
                        <div className="flex flex-col gap-2">
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Vendor</label>
                            <input
                                type="text"
                                value={filters.vendor}
                                onChange={e => setFilters({ ...filters, vendor: e.target.value })}
                                placeholder="Search vendor..."
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--background)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>From Date</label>
                            <input
                                type="date"
                                value={filters.expense_date_from}
                                onChange={e => setFilters({ ...filters, expense_date_from: e.target.value })}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--background)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>To Date</label>
                            <input
                                type="date"
                                value={filters.expense_date_to}
                                onChange={e => setFilters({ ...filters, expense_date_to: e.target.value })}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--background)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Type</label>
                            <select
                                value={filters.is_refund === undefined ? '' : filters.is_refund ? 'refund' : 'expense'}
                                onChange={e => {
                                    const value = e.target.value;
                                    setFilters({ 
                                        ...filters, 
                                        is_refund: value === '' ? undefined : value === 'refund' 
                                    });
                                }}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--background)',
                                    outline: 'none'
                                }}
                            >
                                <option value="">All</option>
                                <option value="expense">Expenses Only</option>
                                <option value="refund">Refunds Only</option>
                            </select>
                        </div>
                        {hasActiveFilters && (
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button
                                    onClick={clearFilters}
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                >
                                    <X size={18} style={{ marginRight: '0.5rem' }} />
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-md)',
                    color: '#991b1b',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Expenses Table or Monthly View */}
            {expenses.length === 0 ? (
                <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    background: 'var(--card-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                }}>
                    <DollarSign size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No expenses found</p>
                    <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
                        {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by creating your first expense'}
                    </p>
                    {!hasActiveFilters && (
                        <button onClick={handleAdd} className="btn btn-primary">
                            <Plus size={18} style={{ marginRight: '0.5rem' }} />
                            New Expense
                        </button>
                    )}
                </div>
            ) : showMonthlyView ? (
                /* Monthly Summary View */
                <div style={{ 
                    background: 'var(--card-bg)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        padding: '1rem 1.5rem', 
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--background)'
                    }}>
                        <h3 style={{ 
                            fontSize: '0.9375rem', 
                            fontWeight: 600, 
                            letterSpacing: '-0.01em',
                            color: 'var(--foreground)'
                        }}>
                            Monthly Summary
                        </h3>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'baseline', 
                            gap: '1.5rem',
                            fontSize: '0.875rem',
                            color: 'var(--foreground)',
                            opacity: 0.7
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span>Total Amount:</span>
                                <span style={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.9375rem',
                                    opacity: 1,
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {formatCurrency(totalMonthlyAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem'
                    }}>
                        <thead>
                            <tr style={{ 
                                background: 'var(--background)',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Month
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Expenses
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Total Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlySummary.map((month, index) => {
                                const isExpanded = expandedMonths.has(month.month);
                                const monthExpenses = getExpensesForMonth(month.month);
                                
                                return (
                                    <React.Fragment key={month.month}>
                                        <tr
                                            style={{ 
                                                borderBottom: 'none',
                                                transition: 'background-color 0.15s ease',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleMonthExpansion(month.month)}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--background)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td style={{ 
                                                padding: '0.875rem 1.5rem',
                                                fontWeight: 500,
                                                color: 'var(--foreground)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {isExpanded ? (
                                                    <ChevronDown size={16} style={{ opacity: 0.6 }} />
                                                ) : (
                                                    <ChevronRight size={16} style={{ opacity: 0.6 }} />
                                                )}
                                                {formatMonthLabel(month.month)}
                                            </td>
                                            <td style={{ 
                                                padding: '0.875rem 1.5rem',
                                                textAlign: 'right',
                                                color: 'var(--foreground)',
                                                opacity: 0.7,
                                                fontVariantNumeric: 'tabular-nums'
                                            }}>
                                                {month.count}
                                            </td>
                                            <td style={{ 
                                                padding: '0.875rem 1.5rem',
                                                textAlign: 'right',
                                                fontWeight: 600,
                                                color: 'var(--foreground)',
                                                fontVariantNumeric: 'tabular-nums'
                                            }}>
                                                {formatCurrency(month.total_cents)}
                                            </td>
                                        </tr>
                                        {isExpanded && monthExpenses.length > 0 && (
                                            <tr>
                                                <td colSpan={3} style={{ padding: 0, borderTop: '1px solid var(--border)' }}>
                                                    <div style={{
                                                        background: 'var(--background)',
                                                        padding: '1rem 1.5rem'
                                                    }}>
                                                        <table style={{ 
                                                            width: '100%', 
                                                            borderCollapse: 'collapse',
                                                            fontSize: '0.8125rem'
                                                        }}>
                                                            <thead>
                                                                <tr style={{ 
                                                                    borderBottom: '1px solid var(--border)',
                                                                    opacity: 0.6
                                                                }}>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Type
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Date
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Vendor
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Item
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'right',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Price
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'right',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Qty
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'right',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Total
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.625rem 0', 
                                                                        textAlign: 'center',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        Actions
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {monthExpenses.map((expense, expIndex) => {
                                                                    const isRefund = expense.is_refund;
                                                                    return (
                                                                        <tr 
                                                                            key={expense.id} 
                                                                            style={{ 
                                                                                borderBottom: expIndex < monthExpenses.length - 1 ? '1px solid var(--border)' : 'none',
                                                                                background: isRefund ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                                                                            }}
                                                                        >
                                                                            <td style={{ padding: '0.75rem 0', fontSize: '0.8125rem' }}>
                                                                                {isRefund ? (
                                                                                    <span style={{ 
                                                                                        display: 'inline-flex', 
                                                                                        alignItems: 'center', 
                                                                                        gap: '0.25rem',
                                                                                        color: '#22c55e',
                                                                                        fontWeight: 500
                                                                                    }}>
                                                                                        <RotateCcw size={12} />
                                                                                        Refund
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ 
                                                                                        display: 'inline-flex', 
                                                                                        alignItems: 'center', 
                                                                                        gap: '0.25rem',
                                                                                        opacity: 0.7
                                                                                    }}>
                                                                                        <DollarSign size={12} />
                                                                                        Expense
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 0', fontSize: '0.8125rem' }}>
                                                                                {formatDate(expense.expense_date)}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 0', fontSize: '0.8125rem', fontWeight: 500 }}>
                                                                                {expense.vendor}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 0', fontSize: '0.8125rem' }}>
                                                                                {expense.item}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '0.8125rem' }}>
                                                                                {formatCurrency(Math.abs(expense.price_cents))}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '0.8125rem' }}>
                                                                                {expense.quantity}
                                                                            </td>
                                                                            <td style={{ 
                                                                                padding: '0.75rem 0', 
                                                                                textAlign: 'right', 
                                                                                fontSize: '0.8125rem', 
                                                                                fontWeight: 600,
                                                                                color: isRefund ? '#22c55e' : 'inherit'
                                                                            }}>
                                                                                {formatCurrency(expense.total_cents)}
                                                                            </td>
                                                                            <td style={{ padding: '0.75rem 0', textAlign: 'center' }}>
                                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleEdit(expense);
                                                                                        }}
                                                                                        className="btn btn-secondary"
                                                                                        style={{ padding: '0.375rem' }}
                                                                                        title="Edit"
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDelete(expense.id);
                                                                                        }}
                                                                                        className="btn btn-secondary"
                                                                                        style={{ padding: '0.375rem', color: '#ef4444' }}
                                                                                        title="Delete"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {index < monthlySummary.length - 1 && (
                                            <tr>
                                                <td colSpan={3} style={{ 
                                                    borderBottom: '1px solid var(--border)',
                                                    height: '1px',
                                                    padding: 0
                                                }}></td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Detailed Table View */
                <div style={{
                    background: 'var(--card-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Type</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Date</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Vendor</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Item</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Price</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Quantity</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Total</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense) => {
                                    const isRefund = expense.is_refund;
                                    return (
                                        <tr 
                                            key={expense.id} 
                                            style={{ 
                                                borderBottom: '1px solid var(--border)',
                                                background: isRefund ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                                            }}
                                        >
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                {isRefund ? (
                                                    <span style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.25rem',
                                                        color: '#22c55e',
                                                        fontWeight: 500
                                                    }}>
                                                        <RotateCcw size={14} />
                                                        Refund
                                                    </span>
                                                ) : (
                                                    <span style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.25rem',
                                                        opacity: 0.7
                                                    }}>
                                                        <DollarSign size={14} />
                                                        Expense
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                {formatDate(expense.expense_date)}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                                {expense.vendor}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                {expense.item}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem' }}>
                                                {formatCurrency(Math.abs(expense.price_cents))}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem' }}>
                                                {expense.quantity}
                                            </td>
                                            <td style={{ 
                                                padding: '1rem', 
                                                textAlign: 'right', 
                                                fontSize: '0.875rem', 
                                                fontWeight: 600,
                                                color: isRefund ? '#22c55e' : 'inherit'
                                            }}>
                                                {formatCurrency(expense.total_cents)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleEdit(expense)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem' }}
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(expense.id)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem', color: '#ef4444' }}
                                                        title="Delete"
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
                </div>
            )}

            {/* Modal */}
            <NewExpenseModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setIsRefundModal(false);
                    setEditingExpense(null);
                }}
                onExpenseCreated={handleExpenseCreated}
                initialData={editingExpense}
                isRefund={isRefundModal}
            />
        </div>
    );
};

export default ExpenseList;

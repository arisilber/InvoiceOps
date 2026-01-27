import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const StatCard = ({ title, value, onClick, label }) => (
    <div
        onClick={onClick}
        style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.5rem',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
            backgroundColor: 'var(--card-bg)'
        }}
        onMouseEnter={(e) => {
            if (onClick) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
            }
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card-bg)';
        }}
    >
        <div style={{
            fontSize: '0.8125rem',
            color: 'var(--foreground)',
            opacity: 0.65,
            marginBottom: '0.5rem',
            fontWeight: 500,
            letterSpacing: '0.01em'
        }}>
            {title}
        </div>
        <div style={{
            fontSize: '1.875rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
        }}>
            {value}
        </div>
        {label && (
            <div style={{
                fontSize: '0.75rem',
                color: 'var(--foreground)',
                opacity: 0.5,
                marginTop: '0.375rem'
            }}>
                {label}
            </div>
        )}
    </div>
);

const Dashboard = ({ onExploreInvoices }) => {
    const navigate = useNavigate();
    const [accountingBasis, setAccountingBasis] = useState('accrual'); // 'cash', 'accrual', or 'time'
    const [chartColors, setChartColors] = useState({
        foreground: '#1d1d1f',
        border: '#d2d2d7',
        cardBg: '#ffffff'
    });
    const [rawData, setRawData] = useState({
        invoices: [],
        clients: [],
        timeEntries: [],
        payments: [],
        expenses: []
    });
    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        paidThisMonth: 0,
        overdueAmount: 0,
        draftAmount: 0,
        totalClients: 0,
        uninvoicedHours: 0,
        uninvoicedAmount: 0,
        timeTrackedThisMonth: 0,
        paymentReceivedThisMonth: 0,
        averageInvoiceValue: 0,
        invoiceStatusBreakdown: {},
        topClients: [],
        recentActivity: [],
        averageHoursPerWeek: 0,
        invoicedLast30Days: 0,
        invoicedLast60Days: 0,
        invoicedLast90Days: 0,
        invoicedAllTime: 0,
        invoicedPrev30Days: 0,
        invoicedPrev60Days: 0,
        invoicedPrev90Days: 0,
        expensesLast30Days: 0,
        expensesLast60Days: 0,
        expensesLast90Days: 0,
        expensesAllTime: 0,
        expensesPrev30Days: 0,
        expensesPrev60Days: 0,
        expensesPrev90Days: 0,
        averageDaysToInvoice: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [invoices, clients, timeEntries, payments, expenses] = await Promise.all([
                api.getInvoices(),
                api.getClients(),
                api.getTimeEntries(),
                api.getPayments(),
                api.getExpenses()
            ]);

            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            const firstDayOfMonth = new Date(thisYear, thisMonth, 1);

            // Calculate invoice stats
            const totals = invoices.reduce((acc, inv) => {
                const amount = inv.total_cents / 100;
                const invDate = new Date(inv.invoice_date);

                if (inv.status === 'paid') {
                    acc.totalRevenue += amount;
                    if (invDate.getMonth() === thisMonth && invDate.getFullYear() === thisYear) {
                        acc.paidThisMonth += amount;
                    }
                } else if (inv.status === 'sent' || inv.status === 'partially_paid') {
                    acc.pendingAmount += amount;
                    if (new Date(inv.due_date) < now) {
                        acc.overdueAmount += amount;
                    }
                } else if (inv.status === 'draft') {
                    acc.draftAmount += amount;
                }
                return acc;
            }, { totalRevenue: 0, pendingAmount: 0, paidThisMonth: 0, overdueAmount: 0, draftAmount: 0 });

            // Calculate invoice status breakdown
            const statusBreakdown = invoices.reduce((acc, inv) => {
                acc[inv.status] = (acc[inv.status] || 0) + 1;
                return acc;
            }, {});

            // Calculate average invoice value (excluding drafts)
            const nonDraftInvoices = invoices.filter(inv => inv.status !== 'draft');
            const averageInvoiceValue = nonDraftInvoices.length > 0
                ? nonDraftInvoices.reduce((sum, inv) => sum + (inv.total_cents / 100), 0) / nonDraftInvoices.length
                : 0;

            // Calculate uninvoiced time entries
            const uninvoicedEntries = timeEntries.filter(te => !te.invoice_id);
            const uninvoicedMinutes = uninvoicedEntries.reduce((sum, te) => sum + te.minutes_spent, 0);
            const uninvoicedHours = uninvoicedMinutes / 60;

            // Calculate uninvoiced amount (need to get client hourly rates)
            let uninvoicedAmountCents = 0;
            for (const entry of uninvoicedEntries) {
                const client = clients.find(c => c.id === entry.client_id);
                if (client) {
                    const hourlyRateCents = client.hourly_rate_cents || 0;
                    const discountPercent = client.discount_percent || 0;
                    const preDiscountAmountCents = Math.round((entry.minutes_spent / 60) * hourlyRateCents);
                    const discountAmountCents = Math.round((preDiscountAmountCents * discountPercent) / 100);
                    uninvoicedAmountCents += preDiscountAmountCents - discountAmountCents;
                }
            }
            const uninvoicedAmount = uninvoicedAmountCents / 100;

            // Calculate time tracked this month
            const timeThisMonth = timeEntries.filter(te => {
                const workDate = new Date(te.work_date);
                return workDate >= firstDayOfMonth;
            });
            const timeTrackedThisMonth = timeThisMonth.reduce((sum, te) => sum + te.minutes_spent, 0) / 60;

            // Calculate payments received this month
            const paymentsThisMonth = payments.filter(p => {
                const paymentDate = new Date(p.payment_date);
                return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear;
            });
            const paymentReceivedThisMonth = paymentsThisMonth.reduce((sum, p) => sum + (p.amount_cents / 100), 0);

            // Calculate average hours per week (last 4 weeks)
            const fourWeeksAgo = new Date(now);
            fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
            const timeLast4Weeks = timeEntries.filter(te => {
                const workDate = new Date(te.work_date);
                return workDate >= fourWeeksAgo;
            });
            const totalMinutesLast4Weeks = timeLast4Weeks.reduce((sum, te) => sum + te.minutes_spent, 0);
            const averageHoursPerWeek = (totalMinutesLast4Weeks / 60) / 4;

            // Calculate invoiced amount by period
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const sixtyDaysAgo = new Date(now);
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const oneTwentyDaysAgo = new Date(now);
            oneTwentyDaysAgo.setDate(oneTwentyDaysAgo.getDate() - 120);
            const oneEightyDaysAgo = new Date(now);
            oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

            let invoicedLast30Days = 0;
            let invoicedLast60Days = 0;
            let invoicedLast90Days = 0;
            let invoicedAllTime = 0;
            let invoicedPrev30Days = 0; // 30-60 days ago
            let invoicedPrev60Days = 0; // 60-120 days ago
            let invoicedPrev90Days = 0; // 90-180 days ago

            // Only count non-draft invoices for invoiced amounts
            invoices.filter(inv => inv.status !== 'draft').forEach(inv => {
                const invDate = new Date(inv.invoice_date);
                const amount = inv.total_cents / 100;
                invoicedAllTime += amount;
                
                if (invDate >= thirtyDaysAgo) {
                    invoicedLast30Days += amount;
                }
                if (invDate >= sixtyDaysAgo) {
                    invoicedLast60Days += amount;
                }
                if (invDate >= ninetyDaysAgo) {
                    invoicedLast90Days += amount;
                }
                // Previous periods
                if (invDate >= sixtyDaysAgo && invDate < thirtyDaysAgo) {
                    invoicedPrev30Days += amount;
                }
                if (invDate >= oneTwentyDaysAgo && invDate < sixtyDaysAgo) {
                    invoicedPrev60Days += amount;
                }
                if (invDate >= oneEightyDaysAgo && invDate < ninetyDaysAgo) {
                    invoicedPrev90Days += amount;
                }
            });

            // Calculate average days to invoice
            const invoicedTimeEntries = timeEntries.filter(te => te.invoice_id && te.invoice_date);
            let totalDays = 0;
            let entryCount = 0;
            invoicedTimeEntries.forEach(te => {
                const workDate = new Date(te.work_date);
                const invoiceDate = new Date(te.invoice_date);
                const daysDiff = Math.round((invoiceDate - workDate) / (1000 * 60 * 60 * 24));
                totalDays += daysDiff;
                entryCount++;
            });
            const averageDaysToInvoice = entryCount > 0 ? totalDays / entryCount : 0;

            // Calculate expenses by period (net of refunds)
            let expensesLast30Days = 0;
            let expensesLast60Days = 0;
            let expensesLast90Days = 0;
            let expensesAllTime = 0;
            let expensesPrev30Days = 0; // 30-60 days ago
            let expensesPrev60Days = 0; // 60-120 days ago
            let expensesPrev90Days = 0; // 90-180 days ago

            expenses.forEach(exp => {
                const expDate = new Date(exp.expense_date);
                const amount = (exp.total_cents || (exp.price_cents * (exp.quantity || 1))) / 100;
                // Refunds are negative, expenses are positive
                const netAmount = exp.is_refund ? -Math.abs(amount) : amount;
                
                expensesAllTime += netAmount;
                
                if (expDate >= thirtyDaysAgo) {
                    expensesLast30Days += netAmount;
                }
                if (expDate >= sixtyDaysAgo) {
                    expensesLast60Days += netAmount;
                }
                if (expDate >= ninetyDaysAgo) {
                    expensesLast90Days += netAmount;
                }
                // Previous periods
                if (expDate >= sixtyDaysAgo && expDate < thirtyDaysAgo) {
                    expensesPrev30Days += netAmount;
                }
                if (expDate >= oneTwentyDaysAgo && expDate < sixtyDaysAgo) {
                    expensesPrev60Days += netAmount;
                }
                if (expDate >= oneEightyDaysAgo && expDate < ninetyDaysAgo) {
                    expensesPrev90Days += netAmount;
                }
            });

            // Calculate top clients by revenue (excluding drafts)
            const clientRevenue = {};
            invoices.filter(inv => inv.status !== 'draft').forEach(inv => {
                if (!clientRevenue[inv.client_id]) {
                    clientRevenue[inv.client_id] = {
                        client_id: inv.client_id,
                        client_name: inv.client_name,
                        revenue: 0
                    };
                }
                clientRevenue[inv.client_id].revenue += inv.total_cents / 100;
            });
            const topClients = Object.values(clientRevenue)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // Store raw data for chart calculation
            setRawData({
                invoices,
                clients,
                timeEntries,
                payments,
                expenses
            });

            setStats({
                ...totals,
                totalClients: clients.length,
                uninvoicedHours: Math.round(uninvoicedHours * 10) / 10,
                uninvoicedAmount: Math.round(uninvoicedAmount * 100) / 100,
                timeTrackedThisMonth: Math.round(timeTrackedThisMonth * 10) / 10,
                paymentReceivedThisMonth: Math.round(paymentReceivedThisMonth * 100) / 100,
                averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
                invoiceStatusBreakdown: statusBreakdown,
                topClients,
                recentActivity: invoices.slice(0, 10).sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)),
                averageHoursPerWeek: Math.round(averageHoursPerWeek * 100) / 100,
                invoicedLast30Days: Math.round(invoicedLast30Days * 100) / 100,
                invoicedLast60Days: Math.round(invoicedLast60Days * 100) / 100,
                invoicedLast90Days: Math.round(invoicedLast90Days * 100) / 100,
                invoicedAllTime: Math.round(invoicedAllTime * 100) / 100,
                invoicedPrev30Days: Math.round(invoicedPrev30Days * 100) / 100,
                invoicedPrev60Days: Math.round(invoicedPrev60Days * 100) / 100,
                invoicedPrev90Days: Math.round(invoicedPrev90Days * 100) / 100,
                expensesLast30Days: Math.round(expensesLast30Days * 100) / 100,
                expensesLast60Days: Math.round(expensesLast60Days * 100) / 100,
                expensesLast90Days: Math.round(expensesLast90Days * 100) / 100,
                expensesAllTime: Math.round(expensesAllTime * 100) / 100,
                expensesPrev30Days: Math.round(expensesPrev30Days * 100) / 100,
                expensesPrev60Days: Math.round(expensesPrev60Days * 100) / 100,
                expensesPrev90Days: Math.round(expensesPrev90Days * 100) / 100,
                averageDaysToInvoice: Math.round(averageDaysToInvoice * 10) / 10
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate chart data based on accounting basis and raw data
    const chartData = useMemo(() => {
        const { invoices, clients, timeEntries, payments, expenses } = rawData;
        
        if (!invoices.length && !payments.length && !timeEntries.length) {
            return [];
        }

        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
        
        // Initialize monthly data structure for last 12 months (including current month)
        const monthlyData = {};
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentMonth);
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = {
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                income: 0,
                expenses: 0
            };
        }

        // Calculate income based on accounting basis
        if (accountingBasis === 'cash') {
            // Cash basis: Use payments (by payment_date)
            payments.forEach(payment => {
                const paymentDate = new Date(payment.payment_date);
                const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].income += payment.amount_cents / 100;
                }
            });
        } else if (accountingBasis === 'time') {
            // Time tracked basis: Use time entries (by work_date)
            timeEntries.forEach(entry => {
                const workDate = new Date(entry.work_date);
                const monthKey = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[monthKey]) {
                    const client = clients.find(c => c.id === entry.client_id);
                    if (client) {
                        const hourlyRateCents = client.hourly_rate_cents || 0;
                        const discountPercent = client.discount_percent || 0;
                        const preDiscountAmountCents = Math.round((entry.minutes_spent / 60) * hourlyRateCents);
                        const discountAmountCents = Math.round((preDiscountAmountCents * discountPercent) / 100);
                        const amount = (preDiscountAmountCents - discountAmountCents) / 100;
                        monthlyData[monthKey].income += amount;
                    }
                }
            });
        } else {
            // Accrual basis: Use invoices (by invoice_date, excluding drafts)
            invoices.filter(inv => inv.status !== 'draft').forEach(inv => {
                const invDate = new Date(inv.invoice_date);
                const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].income += inv.total_cents / 100;
                }
            });
        }

        // Calculate expenses (net of refunds) by expense date
        expenses.forEach(exp => {
            const expDate = new Date(exp.expense_date);
            const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[monthKey]) {
                const amount = (exp.total_cents || (exp.price_cents * (exp.quantity || 1))) / 100;
                // Refunds are negative, expenses are positive
                if (exp.is_refund) {
                    monthlyData[monthKey].expenses -= Math.abs(amount);
                } else {
                    monthlyData[monthKey].expenses += amount;
                }
            }
        });

        // Convert to array and round values
        return Object.values(monthlyData).map(data => ({
            ...data,
            income: Math.round(data.income * 100) / 100,
            expenses: Math.round(data.expenses * 100) / 100
        }));
    }, [rawData, accountingBasis]);

    useEffect(() => {
        fetchStats();
        
        // Get computed CSS variable values for chart colors
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        setChartColors({
            foreground: computedStyle.getPropertyValue('--foreground').trim() || '#1d1d1f',
            border: computedStyle.getPropertyValue('--border').trim() || '#d2d2d7',
            cardBg: computedStyle.getPropertyValue('--card-bg').trim() || '#ffffff'
        });
    }, []);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px'
            }}>
                <Loader2
                    className="animate-spin"
                    size={32}
                    style={{ opacity: 0.4 }}
                />
            </div>
        );
    }

    const formatCurrency = (value) => {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const calculateComparison = (current, previous) => {
        // Handle zero previous value
        if (previous === 0) {
            if (current > 0) return { isHigher: true, percent: 100, text: 'vs previous period' };
            if (current < 0) return { isHigher: false, percent: 100, text: 'vs previous period' };
            return null; // Both zero, no comparison
        }
        
        // Calculate percentage change
        const percent = ((current - previous) / Math.abs(previous)) * 100;
        const isHigher = current > previous;
        const percentAbs = Math.abs(percent);
        
        return {
            isHigher,
            percent: percentAbs,
            text: `${isHigher ? 'Higher' : 'Lower'} by ${percentAbs.toFixed(1)}%`
        };
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
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
                        Dashboard
                    </h1>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        fontWeight: '400'
                    }}>
                        Financial overview and activity summary
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <RefreshCw size={16} style={{ opacity: 0.7 }} />
                    Refresh
                </button>
            </div>

            {/* Key Metrics Grid */}
            <div>
                <h2 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    marginBottom: '1rem',
                    letterSpacing: '-0.01em'
                }}>
                    Key Metrics
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem'
                }}>
                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(stats.totalRevenue)}
                        onClick={() => navigate('/invoices?status=paid')}
                    />
                    <StatCard
                        title="Pending Invoices"
                        value={formatCurrency(stats.pendingAmount)}
                        onClick={() => navigate('/invoices?status=sent')}
                    />
                    <StatCard
                        title="Paid This Month"
                        value={formatCurrency(stats.paidThisMonth)}
                        onClick={() => navigate('/invoices?status=paid')}
                    />
                    <StatCard
                        title="Overdue"
                        value={formatCurrency(stats.overdueAmount)}
                        onClick={() => navigate('/invoices?overdue=true')}
                    />
                    <StatCard
                        title="Draft Invoices"
                        value={formatCurrency(stats.draftAmount)}
                        onClick={() => navigate('/invoices?status=draft')}
                    />
                    <StatCard
                        title="Total Clients"
                        value={stats.totalClients.toString()}
                        onClick={() => navigate('/clients')}
                    />
                    <StatCard
                        title="Uninvoiced Amount"
                        value={formatCurrency(stats.uninvoicedAmount)}
                        onClick={() => navigate('/time-entries?is_invoiced=false')}
                    />
                    <StatCard
                        title="Avg Invoice Amount"
                        value={formatCurrency(stats.averageInvoiceValue)}
                        onClick={() => navigate('/invoices')}
                    />
                    <StatCard
                        title="Avg Days to Invoice"
                        value={stats.averageDaysToInvoice > 0 ? `${stats.averageDaysToInvoice} days` : 'N/A'}
                        onClick={() => navigate('/time-entries?is_invoiced=true')}
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '2rem'
            }}>
                {/* Recent Activity */}
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            letterSpacing: '-0.01em'
                        }}>
                            Recent Invoices
                        </h2>
                        <button
                            onClick={() => navigate('/invoices')}
                            style={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: 'var(--primary)',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem 0',
                                transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = 0.7;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = 1;
                            }}
                        >
                            View All
                        </button>
                    </div>
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--card-bg)',
                        overflow: 'hidden'
                    }}>
                        {stats.recentActivity.length === 0 ? (
                            <div style={{
                                padding: '3rem 1.5rem',
                                textAlign: 'center',
                                color: 'var(--foreground)',
                                opacity: 0.4,
                                fontSize: '0.875rem'
                            }}>
                                No recent invoices
                            </div>
                        ) : (
                            stats.recentActivity.map((invoice, i) => (
                                <div
                                    key={invoice.id}
                                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem 1.5rem',
                                        borderBottom: i !== stats.recentActivity.length - 1 ? '1px solid var(--border)' : 'none',
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
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            marginBottom: '0.25rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.9375rem',
                                                fontWeight: 500,
                                                color: 'var(--foreground)'
                                            }}>
                                                {invoice.client_name}
                                            </div>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                color: 'var(--foreground)',
                                                opacity: 0.5
                                            }}>
                                                INV-{invoice.invoice_number}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '0.8125rem',
                                            color: 'var(--foreground)',
                                            opacity: 0.5
                                        }}>
                                            {formatDate(invoice.invoice_date)} • {formatCurrency(invoice.total_cents / 100)}
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <span className={`badge badge-${invoice.status}`} style={{
                                            textTransform: 'capitalize',
                                            fontSize: '0.75rem'
                                        }}>
                                            {invoice.status.replace('_', ' ')}
                                        </span>
                                        <ChevronRight size={16} style={{ opacity: 0.3 }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Status Breakdown */}
                    <div>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            marginBottom: '1rem',
                            letterSpacing: '-0.01em'
                        }}>
                            Invoice Status
                        </h2>
                        <div style={{
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--card-bg)',
                            overflow: 'hidden'
                        }}>
                            {Object.keys(stats.invoiceStatusBreakdown).length === 0 ? (
                                <div style={{
                                    padding: '2rem 1.5rem',
                                    textAlign: 'center',
                                    color: 'var(--foreground)',
                                    opacity: 0.4,
                                    fontSize: '0.875rem'
                                }}>
                                    No invoices yet
                                </div>
                            ) : (
                                Object.entries(stats.invoiceStatusBreakdown)
                                    .sort(([a], [b]) => stats.invoiceStatusBreakdown[b] - stats.invoiceStatusBreakdown[a])
                                    .map(([status, count], i, arr) => (
                                        <div
                                            key={status}
                                            onClick={() => navigate(`/invoices?status=${status}`)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.875rem 1.5rem',
                                                borderBottom: i !== arr.length - 1 ? '1px solid var(--border)' : 'none',
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
                                            <span className={`badge badge-${status}`} style={{
                                                textTransform: 'capitalize',
                                                fontSize: '0.75rem'
                                            }}>
                                                {status.replace('_', ' ')}
                                            </span>
                                            <div style={{
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                color: 'var(--foreground)'
                                            }}>
                                                {count}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Top Clients */}
                    <div>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                            marginBottom: '1rem',
                            letterSpacing: '-0.01em'
                        }}>
                            Top Clients
                        </h2>
                        <div style={{
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--card-bg)',
                            overflow: 'hidden'
                        }}>
                            {stats.topClients.length === 0 ? (
                                <div style={{
                                    padding: '2rem 1.5rem',
                                    textAlign: 'center',
                                    color: 'var(--foreground)',
                                    opacity: 0.4,
                                    fontSize: '0.875rem'
                                }}>
                                    No client data yet
                                </div>
                            ) : (
                                stats.topClients.map((client, i, arr) => (
                                    <div
                                        key={client.client_id}
                                        onClick={() => navigate(`/clients/${client.client_id}`)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.875rem 1.5rem',
                                            borderBottom: i !== arr.length - 1 ? '1px solid var(--border)' : 'none',
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
                                        <div style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: 'var(--foreground)'
                                        }}>
                                            {client.client_name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: 'var(--foreground)'
                                        }}>
                                            {formatCurrency(client.revenue)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses vs Income Chart */}
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <h2 style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        letterSpacing: '-0.01em'
                    }}>
                        Expenses vs Income (Last 12 Months)
                    </h2>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <span style={{
                            fontSize: '0.8125rem',
                            color: 'var(--foreground)',
                            opacity: 0.7,
                            fontWeight: 500
                        }}>
                            Accounting Basis:
                        </span>
                        <div style={{
                            display: 'flex',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'var(--card-bg)'
                        }}>
                            <button
                                onClick={() => setAccountingBasis('cash')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: accountingBasis === 'cash' ? 'var(--primary)' : 'transparent',
                                    color: accountingBasis === 'cash' ? 'white' : 'var(--foreground)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Cash
                            </button>
                            <button
                                onClick={() => setAccountingBasis('accrual')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: accountingBasis === 'accrual' ? 'var(--primary)' : 'transparent',
                                    color: accountingBasis === 'accrual' ? 'white' : 'var(--foreground)',
                                    transition: 'all 0.15s ease',
                                    borderLeft: '1px solid var(--border)'
                                }}
                            >
                                Accrual
                            </button>
                            <button
                                onClick={() => setAccountingBasis('time')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: accountingBasis === 'time' ? 'var(--primary)' : 'transparent',
                                    color: accountingBasis === 'time' ? 'white' : 'var(--foreground)',
                                    transition: 'all 0.15s ease',
                                    borderLeft: '1px solid var(--border)'
                                }}
                            >
                                Time Tracked
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    padding: '1.5rem'
                }}>
                    {chartData.length === 0 ? (
                        <div style={{
                            padding: '3rem 1.5rem',
                            textAlign: 'center',
                            color: 'var(--foreground)',
                            opacity: 0.4,
                            fontSize: '0.875rem'
                        }}>
                            No data available for chart
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.3} />
                                <XAxis
                                    dataKey="month"
                                    stroke={chartColors.foreground}
                                    style={{ fontSize: '0.75rem', opacity: 0.7 }}
                                />
                                <YAxis
                                    stroke={chartColors.foreground}
                                    style={{ fontSize: '0.75rem', opacity: 0.7 }}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: chartColors.cardBg,
                                        border: `1px solid ${chartColors.border}`,
                                        borderRadius: '6px',
                                        color: chartColors.foreground
                                    }}
                                    formatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '0.8125rem', color: chartColors.foreground }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="income"
                                    stroke="hsl(142, 71%, 45%)"
                                    strokeWidth={2}
                                    dot={{ fill: 'hsl(142, 71%, 45%)', r: 4 }}
                                    name={
                                        accountingBasis === 'cash' 
                                            ? 'Payments Received' 
                                            : accountingBasis === 'time'
                                            ? 'Time Tracked Value'
                                            : 'Invoices Issued'
                                    }
                                />
                                <Line
                                    type="monotone"
                                    dataKey="expenses"
                                    stroke="hsl(0, 84%, 60%)"
                                    strokeWidth={2}
                                    dot={{ fill: 'hsl(0, 84%, 60%)', r: 4 }}
                                    name="Expenses"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Time Period Summary */}
            <div>
                <h2 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    marginBottom: '1rem',
                    letterSpacing: '-0.01em'
                }}>
                    Invoiced Amount by Period
                </h2>
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '2rem'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last 30 Days
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.25rem'
                            }}>
                                {formatCurrency(stats.invoicedLast30Days)}
                            </div>
                            {(() => {
                                const comparison = calculateComparison(stats.invoicedLast30Days, stats.invoicedPrev30Days);
                                if (!comparison) return null;
                                return (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: comparison.isHigher ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        {comparison.isHigher ? '↑' : '↓'} {comparison.text}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last 60 Days
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.25rem'
                            }}>
                                {formatCurrency(stats.invoicedLast60Days)}
                            </div>
                            {(() => {
                                const comparison = calculateComparison(stats.invoicedLast60Days, stats.invoicedPrev60Days);
                                if (!comparison) return null;
                                return (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: comparison.isHigher ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        {comparison.isHigher ? '↑' : '↓'} {comparison.text}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last 90 Days
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.25rem'
                            }}>
                                {formatCurrency(stats.invoicedLast90Days)}
                            </div>
                            {(() => {
                                const comparison = calculateComparison(stats.invoicedLast90Days, stats.invoicedPrev90Days);
                                if (!comparison) return null;
                                return (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: comparison.isHigher ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        {comparison.isHigher ? '↑' : '↓'} {comparison.text}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                All Time
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(stats.invoicedAllTime)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses by Period */}
            <div>
                <h2 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    marginBottom: '1rem',
                    letterSpacing: '-0.01em'
                }}>
                    Expenses by Period
                </h2>
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '2rem'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last 30 Days
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.25rem'
                            }}>
                                {formatCurrency(stats.expensesLast30Days)}
                            </div>
                            {(() => {
                                const comparison = calculateComparison(stats.expensesLast30Days, stats.expensesPrev30Days);
                                if (!comparison) return null;
                                // For expenses, lower is better, so we reverse the color logic
                                return (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: comparison.isHigher ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        {comparison.isHigher ? '↑' : '↓'} {comparison.text}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last 60 Days
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.25rem'
                            }}>
                                {formatCurrency(stats.expensesLast60Days)}
                            </div>
                            {(() => {
                                const comparison = calculateComparison(stats.expensesLast60Days, stats.expensesPrev60Days);
                                if (!comparison) return null;
                                // For expenses, lower is better, so we reverse the color logic
                                return (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: comparison.isHigher ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        {comparison.isHigher ? '↑' : '↓'} {comparison.text}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last 90 Days
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                                marginBottom: '0.25rem'
                            }}>
                                {formatCurrency(stats.expensesLast90Days)}
                            </div>
                            {(() => {
                                const comparison = calculateComparison(stats.expensesLast90Days, stats.expensesPrev90Days);
                                if (!comparison) return null;
                                // For expenses, lower is better, so we reverse the color logic
                                return (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: comparison.isHigher ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        {comparison.isHigher ? '↑' : '↓'} {comparison.text}
                                    </div>
                                );
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--foreground)',
                                opacity: 0.5,
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                All Time
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(stats.expensesAllTime)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

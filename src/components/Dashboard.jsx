import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, Users, DollarSign, FileText, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const StatCard = ({ title, value, change, icon: Icon, trend, onClick, subtitle }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
            flex: 1,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
        }}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } : {}}
        whileTap={onClick ? { scale: 0.98 } : {}}
    >
        <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
            <div style={{
                padding: '0.75rem',
                background: 'var(--ring)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--primary)'
            }}>
                <Icon size={24} />
            </div>
            {change && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    color: trend === 'up' ? 'var(--secondary)' : '#ef4444'
                }}>
                    {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {change}
                </div>
            )}
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>{title}</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{value}</div>
        {subtitle && (
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>{subtitle}</div>
        )}
    </motion.div>
);

const Dashboard = ({ onExploreInvoices }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        paidThisMonth: 0,
        overdueAmount: 0,
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
        invoicedAllTime: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [invoices, clients, timeEntries, payments] = await Promise.all([
                api.getInvoices(),
                api.getClients(),
                api.getTimeEntries(),
                api.getPayments()
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
                }
                return acc;
            }, { totalRevenue: 0, pendingAmount: 0, paidThisMonth: 0, overdueAmount: 0 });

            // Calculate invoice status breakdown
            const statusBreakdown = invoices.reduce((acc, inv) => {
                acc[inv.status] = (acc[inv.status] || 0) + 1;
                return acc;
            }, {});

            // Calculate average invoice value
            const averageInvoiceValue = invoices.length > 0
                ? invoices.reduce((sum, inv) => sum + (inv.total_cents / 100), 0) / invoices.length
                : 0;

            // Calculate uninvoiced time entries
            const uninvoicedEntries = timeEntries.filter(te => !te.invoice_id);
            const uninvoicedMinutes = uninvoicedEntries.reduce((sum, te) => sum + te.minutes_spent, 0);
            const uninvoicedHours = uninvoicedMinutes / 60;

            // Calculate uninvoiced amount (need to get client hourly rates)
            // Match invoice service logic: work in cents, apply discount per entry, round like invoices
            let uninvoicedAmountCents = 0;
            for (const entry of uninvoicedEntries) {
                const client = clients.find(c => c.id === entry.client_id);
                if (client) {
                    const hourlyRateCents = client.hourly_rate_cents || 0;
                    const discountPercent = client.discount_percent || 0;
                    // Calculate pre-discount amount in cents (matching invoice service pattern)
                    const preDiscountAmountCents = Math.round((entry.minutes_spent / 60) * hourlyRateCents);
                    // Calculate discount in cents (matching invoice service pattern)
                    const discountAmountCents = Math.round((preDiscountAmountCents * discountPercent) / 100);
                    // Add discounted amount (matching invoice service pattern)
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

            let invoicedLast30Days = 0;
            let invoicedLast60Days = 0;
            let invoicedLast90Days = 0;
            let invoicedAllTime = 0;

            invoices.forEach(inv => {
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
            });

            // Calculate top clients by revenue
            const clientRevenue = {};
            invoices.forEach(inv => {
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
                recentActivity: invoices.slice(0, 5),
                averageHoursPerWeek: Math.round(averageHoursPerWeek * 100) / 100,
                invoicedLast30Days: Math.round(invoicedLast30Days * 100) / 100,
                invoicedLast60Days: Math.round(invoicedLast60Days * 100) / 100,
                invoicedLast90Days: Math.round(invoicedLast90Days * 100) / 100,
                invoicedAllTime: Math.round(invoicedAllTime * 100) / 100
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Dashboard Overview</h2>
                    <p style={{ opacity: 0.7 }}>Welcome back! Here's what's happening with your invoices.</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={fetchStats}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </header>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={TrendingUp}
                    trend="up"
                    onClick={() => navigate('/invoices?status=paid')}
                />
                <StatCard
                    title="Pending Invoices"
                    value={`$${stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={Clock}
                    trend="down"
                    onClick={() => navigate('/invoices?status=sent')}
                />
                <StatCard
                    title="Paid This Month"
                    value={`$${stats.paidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={CheckCircle}
                    trend="up"
                    onClick={() => navigate('/invoices?status=paid')}
                />
                <StatCard
                    title="Overdue"
                    value={`$${stats.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={AlertCircle}
                    trend="down"
                    onClick={() => navigate('/invoices?overdue=true')}
                />
                <StatCard
                    title="Total Clients"
                    value={stats.totalClients.toString()}
                    icon={Users}
                    onClick={() => navigate('/clients')}
                />
                <StatCard
                    title="Uninvoiced Amount"
                    value={`$${stats.uninvoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    onClick={() => navigate('/time-entries?is_invoiced=false')}
                />
                <StatCard
                    title="Uninvoiced Hours"
                    value={`${stats.uninvoicedHours.toLocaleString(undefined, { minimumFractionDigits: 1 })}h`}
                    icon={Clock}
                    onClick={() => navigate('/time-entries?is_invoiced=false')}
                />
                <StatCard
                    title="Time Tracked This Month"
                    value={`${stats.timeTrackedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 1 })}h`}
                    icon={Clock}
                    onClick={() => navigate('/time-entries')}
                />
                <StatCard
                    title="Payments This Month"
                    value={`$${stats.paymentReceivedThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    trend="up"
                    onClick={() => navigate('/payments')}
                />
                <StatCard
                    title="Average Invoice Value"
                    value={`$${stats.averageInvoiceValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={FileText}
                    onClick={() => navigate('/invoices')}
                />
                <StatCard
                    title="Average Hours/Week"
                    value={`${stats.averageHoursPerWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}h`}
                    icon={Clock}
                    subtitle="Last 4 weeks average"
                    onClick={() => navigate('/time-entries')}
                />
            </div>

            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Recent Activity</h3>
                    <div className="flex flex-col gap-4">
                        {stats.recentActivity.length === 0 && (
                            <div style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No recent activity</div>
                        )}
                        {stats.recentActivity.map((invoice, i) => (
                            <div
                                key={invoice.id}
                                className="flex items-center justify-between"
                                style={{
                                    paddingBottom: '1rem',
                                    borderBottom: i !== stats.recentActivity.length - 1 ? '1px solid var(--border)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    padding: '0.75rem',
                                    margin: '0 -0.75rem',
                                    borderRadius: 'var(--radius-md)'
                                }}
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--ring)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'var(--ring)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        color: 'var(--primary)',
                                        fontSize: '0.875rem'
                                    }}>
                                        {invoice.client_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{invoice.client_name} - INV-{invoice.invoice_number}</div>
                                        <div style={{ fontSize: '0.875rem', opacity: 0.6 }}>{new Date(invoice.invoice_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`badge badge-${invoice.status}`}>{invoice.status}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card glass" style={{ background: 'var(--primary)', color: 'white', border: 'none' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Quick Action</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '1.5rem' }}>
                        {stats.pendingAmount > 0
                            ? `You have $${stats.pendingAmount.toLocaleString()} in pending invoices.`
                            : "All caught up! No pending invoices."}
                    </p>
                    <button className="btn" style={{ background: 'white', color: 'var(--primary)', width: '100%' }} onClick={onExploreInvoices}>
                        View All Invoices
                    </button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PieChart size={20} />
                        Invoice Status Breakdown
                    </h3>
                    <div className="flex flex-col gap-3">
                        {Object.keys(stats.invoiceStatusBreakdown).length === 0 ? (
                            <div style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No invoices yet</div>
                        ) : (
                            Object.entries(stats.invoiceStatusBreakdown).map(([status, count]) => (
                                <div
                                    key={status}
                                    className="flex items-center justify-between"
                                    style={{
                                        padding: '0.75rem',
                                        background: 'var(--ring)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => navigate(`/invoices?status=${status}`)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = 0.8;
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = 1;
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`badge badge-${status}`} style={{ textTransform: 'capitalize' }}>
                                            {status.replace('_', ' ')}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{count}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} />
                        Top Clients by Revenue
                    </h3>
                    <div className="flex flex-col gap-3">
                        {stats.topClients.length === 0 ? (
                            <div style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No client revenue data yet</div>
                        ) : (
                            stats.topClients.map((client, i) => (
                                <div
                                    key={client.client_id}
                                    className="flex items-center justify-between"
                                    style={{
                                        padding: '0.75rem',
                                        background: 'var(--ring)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => navigate(`/clients/${client.client_id}`)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = 0.8;
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = 1;
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'var(--primary)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600,
                                            color: 'white',
                                            fontSize: '0.75rem'
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{client.client_name}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--primary)' }}>
                                        ${client.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Invoiced Amount by Period</h3>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Last 30 Days
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            ${stats.invoicedLast30Days.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Last 60 Days
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            ${stats.invoicedLast60Days.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Last 90 Days
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            ${stats.invoicedLast90Days.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            All Time
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            ${stats.invoicedAllTime.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

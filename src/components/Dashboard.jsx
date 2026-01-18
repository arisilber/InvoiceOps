import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
                recentActivity: invoices.slice(0, 10).sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)),
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border)'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        color: 'var(--foreground)',
                        marginBottom: '0.25rem',
                        letterSpacing: '-0.02em'
                    }}>
                        Dashboard
                    </h1>
                    <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        marginTop: '0.25rem'
                    }}>
                        Financial overview and activity summary
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'var(--foreground)',
                        backgroundColor: 'transparent',
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
                        title="Total Clients"
                        value={stats.totalClients.toString()}
                        onClick={() => navigate('/clients')}
                    />
                    <StatCard
                        title="Uninvoiced Amount"
                        value={formatCurrency(stats.uninvoicedAmount)}
                        onClick={() => navigate('/time-entries?is_invoiced=false')}
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
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(stats.invoicedLast30Days)}
                            </div>
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
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(stats.invoicedLast60Days)}
                            </div>
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
                                letterSpacing: '-0.02em'
                            }}>
                                {formatCurrency(stats.invoicedLast90Days)}
                            </div>
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
        </div>
    );
};

export default Dashboard;

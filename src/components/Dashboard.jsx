import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const StatCard = ({ title, value, change, icon: Icon, trend }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ flex: 1 }}
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
    </motion.div>
);

const Dashboard = ({ onExploreInvoices }) => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        paidThisMonth: 0,
        overdueAmount: 0,
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const invoices = await api.getInvoices();

            const now = new Date();
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();

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

            setStats({
                ...totals,
                recentActivity: invoices.slice(0, 5)
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Dashboard Overview</h2>
                <p style={{ opacity: 0.7 }}>Welcome back! Here's what's happening with your invoices.</p>
            </header>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <StatCard title="Total Revenue" value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={TrendingUp} trend="up" />
                <StatCard title="Pending Invoices" value={`$${stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Clock} trend="down" />
                <StatCard title="Paid This Month" value={`$${stats.paidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={CheckCircle} trend="up" />
                <StatCard title="Overdue" value={`$${stats.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={AlertCircle} trend="down" />
            </div>

            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Recent Activity</h3>
                    <div className="flex flex-col gap-4">
                        {stats.recentActivity.length === 0 && (
                            <div style={{ opacity: 0.5, textAlign: 'center', padding: '1rem' }}>No recent activity</div>
                        )}
                        {stats.recentActivity.map((invoice, i) => (
                            <div key={invoice.id} className="flex items-center justify-between" style={{
                                paddingBottom: '1rem',
                                borderBottom: i !== stats.recentActivity.length - 1 ? '1px solid var(--border)' : 'none'
                            }}>
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
        </div>
    );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, Clock, FileText, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const StatCard = ({ title, value, icon: Icon, subtitle }) => (
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
        </div>
        <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>{title}</div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{value}</div>
        {subtitle && (
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>{subtitle}</div>
        )}
    </motion.div>
);

const ClientDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [clientData, dashboardData] = await Promise.all([
                api.getClient(id),
                api.getClientDashboard(id)
            ]);
            
            setClient(clientData);
            setStats(dashboardData);
        } catch (err) {
            console.error('Error fetching client dashboard:', err);
            setError(err.message || 'Failed to load client dashboard');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (cents) => {
        return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={20} />
                    <strong>Error</strong>
                </div>
                <p>{error}</p>
                <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: '1rem' }}
                    onClick={() => navigate('/clients')}
                >
                    Back to Clients
                </button>
            </div>
        );
    }

    if (!client || !stats) {
        return (
            <div className="card">
                <p>Client not found</p>
                <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: '1rem' }}
                    onClick={() => navigate('/clients')}
                >
                    Back to Clients
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                marginBottom: '32px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem' }}
                    onClick={() => navigate('/clients')}
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        letterSpacing: '-0.02em',
                        marginBottom: '4px',
                        color: 'var(--foreground)'
                    }}>{client.name} Dashboard</h1>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        fontWeight: '400'
                    }}>Client performance and billing overview</p>
                </div>
            </header>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <StatCard 
                    title="Amount Uninvoiced" 
                    value={formatCurrency(stats.amount_uninvoiced_cents)}
                    icon={DollarSign}
                    subtitle="Time tracked not in an invoice"
                />
                <StatCard 
                    title="Average Hours/Week" 
                    value={stats.average_hours_per_week.toFixed(2)}
                    icon={Clock}
                    subtitle="Last 4 weeks average"
                />
                <StatCard 
                    title="Total Invoiced Not Paid" 
                    value={formatCurrency(stats.total_invoiced_not_paid_cents)}
                    icon={FileText}
                    subtitle="Outstanding invoices"
                />
                <StatCard 
                    title="Amount Invoiced Unpaid" 
                    value={formatCurrency(stats.amount_invoiced_unpaid_cents)}
                    icon={AlertCircle}
                    subtitle="Unpaid invoice amount"
                />
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Invoiced Amount by Period</h3>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Last 30 Days
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.invoiced_last_30_days_cents)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Last 60 Days
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.invoiced_last_60_days_cents)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Last 90 Days
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.invoiced_last_90_days_cents)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                            All Time
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {formatCurrency(stats.invoiced_all_time_cents)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;


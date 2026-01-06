import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Mail, Phone, MapPin, MoreVertical, ExternalLink, Loader2, BarChart3 } from 'lucide-react';
import api from '../services/api';

const ClientList = ({ onNewClient, onEditClient }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);

    useEffect(() => {
        fetchClients();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        if (activeMenu) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await api.getClients();
            // In a real app, we might join these with invoice counts
            // For now, we'll map them to the expected UI structure
            setClients(data.map(client => ({
                ...client,
                invoices: 0, // Placeholder
                totalBilled: 0 // Placeholder
            })));
            setError(null);
        } catch (err) {
            console.error('Error fetching clients:', err);
            setError('Failed to load clients. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '400px' }}>
                <Loader2 className="animate-spin" size={48} style={{ opacity: 0.5 }} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
        >
            <header className="flex justify-between items-center">
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Clients</h2>
                    <p style={{ opacity: 0.7 }}>Manage your customer database and billing history.</p>
                </div>
                <div className="flex gap-2">
                    <div className="glass flex items-center gap-2" style={{ padding: '0 1rem', borderRadius: 'var(--radius-md)' }}>
                        <Search size={18} style={{ opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Search clients..."
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
                    </div>
                    <button className="btn btn-primary" onClick={onNewClient}>
                        <Plus size={18} />
                        Add Client
                    </button>
                </div>
            </header>

            {error && (
                <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
                    {error}
                </div>
            )}

            {!error && filteredClients.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ opacity: 0.5, marginBottom: '1rem' }}>No clients found.</div>
                    <button className="btn btn-secondary" onClick={onNewClient}>
                        <Plus size={18} />
                        Create your first client
                    </button>
                </div>
            )}

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {filteredClients.map((client) => (
                    <motion.div
                        key={client.id}
                        layout
                        className="card"
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'var(--ring)',
                                    color: 'var(--primary)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: 700
                                }}>
                                    {client.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem' }}>{client.name}</h3>
                                    <div className="flex items-center gap-1" style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                                        <MapPin size={14} />
                                        {client.type === 'company' ? 'Company' : 'Individual'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenu(activeMenu === client.id ? null : client.id);
                                    }}
                                >
                                    <MoreVertical size={18} />
                                </button>

                                <AnimatePresence>
                                    {activeMenu === client.id && (
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
                                                boxShadow: 'var(--shadow-lg)',
                                                zIndex: 10,
                                                minWidth: '150px',
                                                overflow: 'hidden'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                className="btn-menu-item"
                                                onClick={() => {
                                                    onEditClient(client);
                                                    setActiveMenu(null);
                                                }}
                                            >
                                                Edit Client
                                            </button>
                                            <button
                                                className="btn-menu-item"
                                                style={{ color: 'var(--error)' }}
                                                onClick={() => {
                                                    // Delete functionality could go here
                                                    setActiveMenu(null);
                                                }}
                                            >
                                                Delete Client
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2" style={{ padding: '0.5rem 0' }}>
                            <div className="flex items-center gap-2" style={{ fontSize: '0.875rem' }}>
                                <Mail size={14} style={{ opacity: 0.5 }} />
                                <span>{client.email}</span>
                            </div>
                            <div className="flex items-center gap-2" style={{ fontSize: '0.875rem' }}>
                                <span style={{ opacity: 0.5, fontWeight: 600 }}>Rate:</span>
                                <span>${(client.hourly_rate_cents / 100).toFixed(2)}/hr</span>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>Invoices</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{client.invoices}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>Total Billed</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>${(client.totalBilled / 100).toLocaleString()}</div>
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            onClick={() => navigate(`/clients/${client.id}/dashboard`)}
                        >
                            <BarChart3 size={14} />
                            View Dashboard
                        </button>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default ClientList;

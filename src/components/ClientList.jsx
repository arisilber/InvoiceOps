import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Mail, Phone, Building2, User, MoreVertical, ChevronRight, Loader2, BarChart3, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';

const ClientList = ({ onNewClient, onEditClient }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [deletingClient, setDeletingClient] = useState(null);

    useEffect(() => {
        fetchClients();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeMenu && !e.target.closest('[data-menu]')) {
                setActiveMenu(null);
            }
        };
        if (activeMenu) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await api.getClients();
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

    const handleDelete = async (clientId, clientName) => {
        if (!window.confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingClient(clientId);
            await api.deleteClient(clientId);
            await fetchClients();
            setActiveMenu(null);
        } catch (err) {
            console.error('Error deleting client:', err);
            alert('Failed to delete client. Please try again.');
        } finally {
            setDeletingClient(null);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px'
            }}>
                <Loader2 className="animate-spin" size={24} style={{ opacity: 0.4 }} />
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxWidth: '1400px',
            width: '100%'
        }}>
            {/* Header */}
            <div style={{
                marginBottom: '32px',
                paddingBottom: '24px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '24px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: '600',
                            letterSpacing: '-0.02em',
                            marginBottom: '6px',
                            color: 'var(--foreground)'
                        }}>
                            Clients
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            fontWeight: '400'
                        }}>
                            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
                        </p>
                    </div>
                    
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        {/* Search */}
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <Search 
                                size={18} 
                                style={{ 
                                    position: 'absolute',
                                    left: '12px',
                                    opacity: 0.4,
                                    pointerEvents: 'none'
                                }} 
                            />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '10px 12px 10px 40px',
                                    fontSize: '15px',
                                    fontFamily: 'inherit',
                                    backgroundColor: 'var(--background)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    width: '280px',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                        
                        {/* Add Button */}
                        <button
                            onClick={onNewClient}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                fontSize: '15px',
                                fontWeight: '500',
                                fontFamily: 'inherit',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                        >
                            <Plus size={18} />
                            Add Client
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#dc2626'
                }}>
                    {error}
                </div>
            )}

            {/* Empty State */}
            {!error && filteredClients.length === 0 && searchTerm === '' && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '64px 32px',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '24px',
                        backgroundColor: 'var(--ring)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <User size={24} style={{ opacity: 0.4 }} />
                    </div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: 'var(--foreground)'
                    }}>
                        No clients yet
                    </h3>
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        marginBottom: '24px'
                    }}>
                        Get started by adding your first client
                    </p>
                    <button
                        onClick={onNewClient}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            fontSize: '15px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                    >
                        <Plus size={18} />
                        Add First Client
                    </button>
                </div>
            )}

            {/* No Results */}
            {!error && filteredClients.length === 0 && searchTerm !== '' && (
                <div style={{
                    padding: '48px 32px',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)'
                }}>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6
                    }}>
                        No clients found matching "{searchTerm}"
                    </p>
                </div>
            )}

            {/* Clients Table */}
            {!error && filteredClients.length > 0 && (
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-bg)',
                    overflow: 'hidden'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse'
                    }}>
                        <thead>
                            <tr style={{
                                borderBottom: '1px solid var(--border)',
                                backgroundColor: 'var(--background)'
                            }}>
                                <th style={{
                                    padding: '14px 16px',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Client
                                </th>
                                <th style={{
                                    padding: '14px 16px',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Contact
                                </th>
                                <th style={{
                                    padding: '14px 16px',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Rate
                                </th>
                                <th style={{
                                    padding: '14px 16px',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Type
                                </th>
                                <th style={{
                                    padding: '14px 16px',
                                    width: '1%'
                                }}>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client, index) => (
                                <tr
                                    key={client.id}
                                    style={{
                                        borderBottom: index < filteredClients.length - 1 ? '1px solid var(--border)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.1s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    onClick={() => navigate(`/clients/${client.id}/dashboard`)}
                                >
                                    {/* Client Name */}
                                    <td style={{
                                        padding: '16px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                backgroundColor: 'var(--ring)',
                                                color: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                flexShrink: 0
                                            }}>
                                                {client.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: '500',
                                                    color: 'var(--foreground)',
                                                    marginBottom: '2px'
                                                }}>
                                                    {client.name}
                                                </div>
                                                {client.phone && (
                                                    <div style={{
                                                        fontSize: '13px',
                                                        color: 'var(--foreground)',
                                                        opacity: 0.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <Phone size={12} />
                                                        {client.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Contact */}
                                    <td style={{
                                        padding: '16px'
                                    }}>
                                        {client.email ? (
                                            <div style={{
                                                fontSize: '14px',
                                                color: 'var(--foreground)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <Mail size={14} style={{ opacity: 0.4 }} />
                                                {client.email}
                                            </div>
                                        ) : (
                                            <span style={{
                                                fontSize: '14px',
                                                color: 'var(--foreground)',
                                                opacity: 0.4
                                            }}>
                                                No email
                                            </span>
                                        )}
                                    </td>

                                    {/* Rate */}
                                    <td style={{
                                        padding: '16px',
                                        textAlign: 'right'
                                    }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: 'var(--foreground)'
                                        }}>
                                            ${(client.hourly_rate_cents / 100).toFixed(2)}
                                            <span style={{
                                                fontSize: '13px',
                                                fontWeight: '400',
                                                opacity: 0.6,
                                                marginLeft: '2px'
                                            }}>
                                                /hr
                                            </span>
                                        </div>
                                    </td>

                                    {/* Type */}
                                    <td style={{
                                        padding: '16px',
                                        textAlign: 'right'
                                    }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '13px',
                                            color: 'var(--foreground)',
                                            opacity: 0.6
                                        }}>
                                            {client.type === 'company' ? (
                                                <>
                                                    <Building2 size={14} />
                                                    Company
                                                </>
                                            ) : (
                                                <>
                                                    <User size={14} />
                                                    Individual
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td style={{
                                        padding: '16px',
                                        position: 'relative'
                                    }}>
                                        <div data-menu style={{
                                            position: 'relative'
                                        }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === client.id ? null : client.id);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.15s ease',
                                                    color: 'var(--foreground)',
                                                    opacity: 0.6
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = 'var(--background)';
                                                    e.target.style.opacity = '1';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'transparent';
                                                    e.target.style.opacity = '0.6';
                                                }}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {activeMenu === client.id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    right: 0,
                                                    marginTop: '4px',
                                                    backgroundColor: 'var(--card-bg)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '8px',
                                                    minWidth: '180px',
                                                    overflow: 'hidden',
                                                    zIndex: 100
                                                }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditClient(client);
                                                            setActiveMenu(null);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            textAlign: 'left',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--foreground)',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            fontFamily: 'inherit',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            transition: 'background-color 0.1s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--background)'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    >
                                                        <Edit2 size={16} style={{ opacity: 0.6 }} />
                                                        Edit Client
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/clients/${client.id}/dashboard`);
                                                            setActiveMenu(null);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            textAlign: 'left',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--foreground)',
                                                            cursor: 'pointer',
                                                            fontSize: '14px',
                                                            fontFamily: 'inherit',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            transition: 'background-color 0.1s ease',
                                                            borderTop: '1px solid var(--border)'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--background)'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    >
                                                        <BarChart3 size={16} style={{ opacity: 0.6 }} />
                                                        View Dashboard
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(client.id, client.name);
                                                        }}
                                                        disabled={deletingClient === client.id}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px',
                                                            textAlign: 'left',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            color: '#dc2626',
                                                            cursor: deletingClient === client.id ? 'not-allowed' : 'pointer',
                                                            fontSize: '14px',
                                                            fontFamily: 'inherit',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            transition: 'background-color 0.1s ease',
                                                            borderTop: '1px solid var(--border)',
                                                            opacity: deletingClient === client.id ? 0.5 : 1
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (deletingClient !== client.id) {
                                                                e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (deletingClient !== client.id) {
                                                                e.target.style.backgroundColor = 'transparent';
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                        {deletingClient === client.id ? 'Deleting...' : 'Delete Client'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ClientList;

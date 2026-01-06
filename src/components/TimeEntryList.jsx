import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Search,
    Filter,
    Calendar as CalendarIcon,
    User,
    Briefcase,
    Edit2,
    Trash2,
    ChevronRight,
    Download,
    Plus,
    X,
    Loader2,
    AlertCircle,
    FileText,
    Upload
} from 'lucide-react';
import api from '../services/api';
import LogTimeEntry from './LogTimeEntry';
import CreateInvoiceFromTimeEntriesModal from './CreateInvoiceFromTimeEntriesModal';
import CSVTimeEntryUpload from './CSVTimeEntryUpload';
import { formatDate as formatDateUtil } from '../utils/timeParser';

const TimeEntryList = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [clients, setClients] = useState([]);
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        client_id: '',
        work_type_id: '',
        work_date_from: '',
        work_date_to: '',
        is_invoiced: '' // '' (all), 'true', 'false'
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [entriesData, clientsData, workTypesData] = await Promise.all([
                api.getTimeEntries(filters),
                api.getClients(),
                api.getWorkTypes()
            ]);
            setEntries(entriesData);
            setClients(clientsData);
            setWorkTypes(workTypesData);
            setError(null);
        } catch (err) {
            console.error('Error fetching time entries:', err);
            setError('Failed to load time entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this time entry?')) return;

        try {
            await api.deleteTimeEntry(id);
            setEntries(entries.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry');
        }
    };

    const handleEdit = (entry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    const formatMinutes = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const formatDate = (dateString) => {
        return formatDateUtil(dateString);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Time Tracking</h2>
                    <p style={{ opacity: 0.7 }}>Review and manage your logged work</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setIsCSVUploadOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Upload size={18} />
                        Bulk Upload
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setIsInvoiceModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FileText size={18} />
                        Create Invoice
                    </button>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        <Plus size={20} />
                        Log Time
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Client</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <select
                                value={filters.client_id}
                                onChange={e => setFilters({ ...filters, client_id: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            >
                                <option value="">All Clients</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Work Type</label>
                        <div style={{ position: 'relative' }}>
                            <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <select
                                value={filters.work_type_id}
                                onChange={e => setFilters({ ...filters, work_type_id: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            >
                                <option value="">All Types</option>
                                {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.description}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>From Date</label>
                        <div style={{ position: 'relative' }}>
                            <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="date"
                                value={filters.work_date_from}
                                onChange={e => setFilters({ ...filters, work_date_from: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>To Date</label>
                        <div style={{ position: 'relative' }}>
                            <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="date"
                                value={filters.work_date_to}
                                onChange={e => setFilters({ ...filters, work_date_to: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Status</label>
                        <div style={{ position: 'relative' }}>
                            <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <select
                                value={filters.is_invoiced}
                                onChange={e => setFilters({ ...filters, is_invoiced: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="true">Invoiced</option>
                                <option value="false">Uninvoiced</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={() => setFilters({ client_id: '', work_type_id: '', work_date_from: '', work_date_to: '', is_invoiced: '' })}
                        style={{ height: '2.8rem' }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Entries List */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                    <p style={{ opacity: 0.6 }}>Loading entries...</p>
                </div>
            ) : error ? (
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <AlertCircle size={24} />
                    <p>{error}</p>
                </div>
            ) : entries.length === 0 ? (
                <div className="card glass" style={{ textAlign: 'center', padding: '4rem' }}>
                    <Clock size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>No time entries found</h3>
                    <p style={{ opacity: 0.6, marginBottom: '1.5rem' }}>Try adjusting your filters or log some new work.</p>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        <Plus size={20} />
                        Log Your First Entry
                    </button>
                </div>
            ) : (
                <div className="card glass" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>Date</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>Client & Project</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>Work Type</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>Duration</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>Status</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, opacity: 0.7 }}>Details</th>
                                <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {entries.map((entry) => (
                                    <motion.tr
                                        key={entry.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                        className="table-row-hover"
                                    >
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontWeight: 500 }}>{formatDate(entry.work_date)}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontWeight: 600 }}>{entry.client_name}</div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{entry.project_name}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '2rem',
                                                background: 'var(--ring)',
                                                color: 'var(--primary)',
                                                fontWeight: 600
                                            }}>
                                                {entry.work_type_code}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                                <Clock size={14} opacity={0.5} />
                                                {formatMinutes(entry.minutes_spent)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            {entry.invoice_id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '0.5rem',
                                                        background: 'rgba(34, 197, 94, 0.1)',
                                                        color: '#22c55e',
                                                        border: '1px solid rgba(34, 197, 94, 0.2)',
                                                        fontWeight: 600,
                                                        width: 'fit-content'
                                                    }}>
                                                        Invoiced
                                                    </span>
                                                    {entry.invoice_number && (
                                                        <button
                                                            onClick={() => navigate(`/invoices/${entry.invoice_id}`)}
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--primary)',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                padding: 0,
                                                                textAlign: 'left',
                                                                fontWeight: 500,
                                                                opacity: 0.9
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                                                            onMouseLeave={(e) => e.target.style.opacity = '0.9'}
                                                        >
                                                            #{entry.invoice_number}
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '0.5rem',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'var(--foreground)',
                                                    opacity: 0.5,
                                                    border: '1px solid var(--border)',
                                                    fontWeight: 600
                                                }}>
                                                    Uninvoiced
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', maxWidth: '300px' }}>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {entry.detail || <span style={{ opacity: 0.3 }}>No details</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleEdit(entry)}
                                                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit/Add Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="card"
                            style={{
                                width: '100%',
                                maxWidth: '600px',
                                position: 'relative',
                                background: 'var(--background)',
                                zIndex: 1001,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '2rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>{editingEntry ? 'Edit Time Entry' : 'Log New Work'}</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', opacity: 0.5 }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <LogTimeEntry
                                initialData={editingEntry}
                                isModal={true}
                                onSave={() => {
                                    setIsModalOpen(false);
                                    fetchData();
                                }}
                                onCancel={() => setIsModalOpen(false)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Invoice from Time Entries Modal */}
            <CreateInvoiceFromTimeEntriesModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                onInvoiceCreated={() => {
                    setIsInvoiceModalOpen(false);
                    fetchData(); // Refresh time entries to show invoice status
                }}
            />

            {/* CSV Upload Modal */}
            <AnimatePresence>
                {isCSVUploadOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCSVUploadOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="card"
                            style={{
                                width: '100%',
                                maxWidth: '800px',
                                position: 'relative',
                                background: 'var(--background)',
                                zIndex: 1001,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '2rem'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>Bulk Upload Time Entries</h3>
                                <button
                                    onClick={() => setIsCSVUploadOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', opacity: 0.5 }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <CSVTimeEntryUpload
                                onUploadComplete={() => {
                                    setIsCSVUploadOpen(false);
                                    fetchData();
                                }}
                                clients={clients}
                                workTypes={workTypes}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .table-row-hover:hover {
                    background: rgba(255,255,255,0.03);
                }
                @media (prefers-color-scheme: dark) {
                    .table-row-hover:hover {
                        background: rgba(255,255,255,0.05);
                    }
                }
            `}</style>
        </div>
    );
};

export default TimeEntryList;

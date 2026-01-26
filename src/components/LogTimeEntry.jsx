import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Briefcase, FileText, User, Plus, Check, Loader2 } from 'lucide-react';
import api from '../services/api';
import { parseTimeToMinutes, getLocalDateString, utcDateToLocalDateString, localDateStringToUtc } from '../utils/timeParser';

const LogTimeEntry = ({ initialData, onSave, onCancel, isModal = false }) => {
    const [clients, setClients] = useState([]);
    const [workTypes, setWorkTypes] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [projectNames, setProjectNames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        client_id: initialData?.client_id || '',
        work_type_id: initialData?.work_type_id || '',
        project_name: initialData?.project_name || '',
        work_date: initialData?.work_date ? utcDateToLocalDateString(initialData.work_date) : getLocalDateString(),
        time_spent: initialData?.minutes_spent ?
            (initialData.minutes_spent >= 60 ?
                `${Math.floor(initialData.minutes_spent / 60)}:${(initialData.minutes_spent % 60).toString().padStart(2, '0')}` :
                initialData.minutes_spent.toString()) : '',
        detail: initialData?.detail || '',
        invoice_id: initialData?.invoice_id || ''
    });

    const fetchData = async () => {
        try {
            setInitialLoading(true);
            const [clientsData, workTypesData] = await Promise.all([
                api.getClients(),
                api.getWorkTypes()
            ]);
            setClients(clientsData);
            setWorkTypes(workTypesData);

            if (workTypesData.length > 0 && !initialData) {
                setFormData(prev => ({ ...prev, work_type_id: workTypesData[0].id }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchInvoices = async (clientId) => {
        if (!clientId) {
            setInvoices([]);
            return;
        }
        try {
            const data = await api.getInvoices({ client_id: clientId });
            setInvoices(data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        }
    };

    const fetchProjectNames = async (clientId) => {
        if (!clientId) {
            setProjectNames([]);
            return;
        }
        try {
            const data = await api.getProjectNames(clientId);
            setProjectNames(data);
        } catch (error) {
            console.error('Error fetching project names:', error);
            setProjectNames([]);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.client_id) {
            fetchInvoices(formData.client_id);
            fetchProjectNames(formData.client_id);
        } else {
            setProjectNames([]);
        }
    }, [formData.client_id]);

    const parseTimeSpent = (value) => {
        return parseTimeToMinutes(value);
    };

    const handleSubmit = async (e, addAnother = false) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage('');

        try {
            const minutes_spent = parseTimeSpent(formData.time_spent);
            if (minutes_spent <= 0) {
                throw new Error('Please enter a valid time spent.');
            }

            const payload = {
                client_id: parseInt(formData.client_id),
                work_type_id: parseInt(formData.work_type_id),
                project_name: formData.project_name,
                work_date: localDateStringToUtc(formData.work_date),
                minutes_spent,
                detail: formData.detail,
                invoice_id: formData.invoice_id ? parseInt(formData.invoice_id) : null
            };

            if (initialData?.id) {
                await api.updateTimeEntry(initialData.id, payload);
                setSuccessMessage('Time entry updated successfully!');
            } else {
                await api.createTimeEntry(payload);
                setSuccessMessage('Time entry saved successfully!');
            }

            if (onSave) onSave();
            setTimeout(() => setSuccessMessage(''), 3000);

            if (addAnother) {
                setFormData({
                    ...formData,
                    time_spent: '',
                    detail: ''
                    // Keep client, work type, project and date for convenience
                });
            } else {
                setFormData({
                    client_id: '',
                    work_type_id: workTypes[0]?.id || '',
                    project_name: '',
                    work_date: getLocalDateString(),
                    time_spent: '',
                    detail: ''
                });
            }
        } catch (error) {
            console.error('Error saving time entry:', error);
            alert(error.message || 'Failed to save time entry');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div style={isModal ? {} : { maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <motion.div
                initial={isModal ? { opacity: 1 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={isModal ? "" : "card glass"}
                style={isModal ? { padding: '1rem' } : { padding: '2.5rem' }}
            >
                {!isModal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'var(--primary)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{initialData ? 'Edit Time Entry' : 'Log Time Entry'}</h2>
                            <p style={{ opacity: 0.7 }}>{initialData ? 'Update your billable work details' : 'Capture your billable work for clients'}</p>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--secondary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <Check size={20} />
                        {successMessage}
                    </motion.div>
                )}

                {initialData?.invoice_id && (
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        fontSize: '0.9rem'
                    }}>
                        <FileText size={20} />
                        This entry is part of an invoice. Changes may affect your records.
                    </div>
                )}

                <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="flex flex-col gap-2">
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} opacity={0.7} /> Client
                            </label>
                            <select
                                required
                                value={formData.client_id}
                                onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                style={{
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            >
                                <option value="">Select Client</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Briefcase size={16} opacity={0.7} /> Work Type
                            </label>
                            <select
                                required
                                value={formData.work_type_id}
                                onChange={e => setFormData({ ...formData, work_type_id: e.target.value })}
                                style={{
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            >
                                {workTypes.map(wt => (
                                    <option key={wt.id} value={wt.id}>{wt.description} ({wt.code})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} opacity={0.7} /> Project Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                list="project-names-list"
                                placeholder="e.g. Website Overhaul"
                                required
                                value={formData.project_name}
                                onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                                style={{
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.15s ease',
                                    width: '100%'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                            {projectNames.length > 0 && (
                                <datalist id="project-names-list">
                                    {projectNames.map((projectName, index) => (
                                        <option key={index} value={projectName} />
                                    ))}
                                </datalist>
                            )}
                        </div>
                        {projectNames.length > 0 && (
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                Select from previous projects or type a new project name
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="flex flex-col gap-2">
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} opacity={0.7} /> Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.work_date}
                                onChange={e => setFormData({ ...formData, work_date: e.target.value })}
                                style={{
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={16} opacity={0.7} /> Time Spent
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 90, 1:30, or 0.75"
                                required
                                value={formData.time_spent}
                                onChange={e => setFormData({ ...formData, time_spent: e.target.value })}
                                style={{
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg)',
                                    color: 'var(--foreground)',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.15s ease'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Use minutes (90), hours:minutes (1:30), or decimal hours (0.75). Rounds up to nearest 5 minutes.</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} opacity={0.7} /> Associate with Invoice (Optional)
                        </label>
                        <select
                            value={formData.invoice_id}
                            onChange={e => setFormData({ ...formData, invoice_id: e.target.value })}
                            style={{
                                padding: '0.875rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--card-bg)',
                                color: 'var(--foreground)',
                                outline: 'none',
                                fontSize: '1rem',
                                transition: 'border-color 0.15s ease'
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        >
                            <option value="">Not part of an invoice</option>
                            {invoices.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                    INV-{inv.invoice_number} ({new Date(inv.invoice_date).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Detail
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Describe the work done..."
                            value={formData.detail}
                            onChange={e => setFormData({ ...formData, detail: e.target.value })}
                            style={{
                                padding: '0.875rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--card-bg)',
                                color: 'var(--foreground)',
                                outline: 'none',
                                fontSize: '1rem',
                                resize: 'vertical',
                                transition: 'border-color 0.15s ease'
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1, height: '3.5rem', fontSize: '1rem' }}
                            onClick={(e) => handleSubmit(e, false)}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (initialData ? 'Update Entry' : 'Save Entry')}
                        </button>
                        {!initialData && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flex: 1, height: '3.5rem', fontSize: '1rem', background: 'transparent', border: '1px solid var(--border)' }}
                                onClick={(e) => handleSubmit(e, true)}
                                disabled={loading}
                            >
                                <Plus size={18} /> Save & Add Another
                            </button>
                        )}
                        {isModal && onCancel && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flex: 1, height: '3.5rem', fontSize: '1rem', background: 'transparent', border: '1px solid var(--border)' }}
                                onClick={onCancel}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default LogTimeEntry;

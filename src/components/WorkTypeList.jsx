import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, MoreVertical, Loader2, X, Tag, FileText, Trash2, Edit2 } from 'lucide-react';
import api from '../services/api';

const WorkTypeList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkType, setEditingWorkType] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState(null);

    const [formData, setFormData] = useState({
        code: '',
        description: ''
    });

    useEffect(() => {
        fetchWorkTypes();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        if (activeMenu) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    const fetchWorkTypes = async () => {
        try {
            setLoading(true);
            const data = await api.getWorkTypes();
            setWorkTypes(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching work types:', err);
            setError('Failed to load work types. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const filteredWorkTypes = workTypes.filter(wt =>
        wt.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wt.description && wt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const openModal = (workType = null) => {
        if (workType) {
            setEditingWorkType(workType);
            setFormData({
                code: workType.code,
                description: workType.description || ''
            });
        } else {
            setEditingWorkType(null);
            setFormData({
                code: '',
                description: ''
            });
        }
        setModalError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingWorkType(null);
        setFormData({ code: '', description: '' });
        setModalError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setModalLoading(true);
            setModalError(null);

            if (!formData.code) {
                throw new Error('Code is required');
            }

            if (editingWorkType) {
                await api.updateWorkType(editingWorkType.id, formData);
            } else {
                await api.createWorkType(formData);
            }

            await fetchWorkTypes();
            closeModal();
        } catch (err) {
            console.error('Error saving work type:', err);
            setModalError(err.message || 'Failed to save work type');
        } finally {
            setModalLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this work type?')) return;

        try {
            await api.deleteWorkType(id);
            await fetchWorkTypes();
        } catch (err) {
            console.error('Error deleting work type:', err);
            alert(err.message || 'Failed to delete work type');
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
        >
            <header className="flex justify-between items-center">
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Work Types</h2>
                    <p style={{ opacity: 0.7 }}>Configure categories for your billable work items.</p>
                </div>
                <div className="flex gap-2">
                    <div className="glass flex items-center gap-2" style={{ padding: '0 1rem', borderRadius: 'var(--radius-md)' }}>
                        <Search size={18} style={{ opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Search work types..."
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
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        Add Work Type
                    </button>
                </div>
            </header>

            {error && (
                <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
                    {error}
                </div>
            )}

            {!error && filteredWorkTypes.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ opacity: 0.5, marginBottom: '1rem' }}>No work types found.</div>
                    <button className="btn btn-secondary" onClick={() => openModal()}>
                        <Plus size={18} />
                        Create your first work type
                    </button>
                </div>
            )}

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {filteredWorkTypes.map((wt) => (
                    <motion.div
                        key={wt.id}
                        layout
                        className="card"
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    background: 'var(--ring)',
                                    color: 'var(--primary)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Tag size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', textTransform: 'capitalize' }}>{wt.code}</h3>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                                        Work Category
                                    </div>
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenu(activeMenu === wt.id ? null : wt.id);
                                    }}
                                >
                                    <MoreVertical size={18} />
                                </button>

                                <AnimatePresence>
                                    {activeMenu === wt.id && (
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
                                                    openModal(wt);
                                                    setActiveMenu(null);
                                                }}
                                            >
                                                <Edit2 size={14} />
                                                Edit
                                            </button>
                                            <button
                                                className="btn-menu-item"
                                                style={{ color: 'var(--error)' }}
                                                onClick={() => {
                                                    handleDelete(wt.id);
                                                    setActiveMenu(null);
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.925rem', opacity: 0.8, minHeight: '3em' }}>
                            {wt.description || 'No description provided.'}
                        </div>

                        <div style={{
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border)',
                            fontSize: '0.75rem',
                            opacity: 0.5,
                            fontFamily: 'monospace'
                        }}>
                            ID: {wt.id.toString().padStart(3, '0')}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '2rem'
                    }} onClick={closeModal}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                background: 'var(--background)',
                                width: '100%',
                                maxWidth: '500px',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-lg)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <header style={{
                                padding: '1.5rem',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h2 style={{ fontSize: '1.5rem' }}>{editingWorkType ? 'Edit Work Type' : 'Add Work Type'}</h2>
                                <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={closeModal}>
                                    <X size={20} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit}>
                                <div style={{ padding: '2rem' }}>
                                    <div className="flex flex-col gap-5">
                                        {modalError && (
                                            <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)', padding: '1rem' }}>
                                                {modalError}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2">
                                            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Code (identifer)</label>
                                            <div className="glass flex items-center gap-2" style={{ padding: '0 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                                <Tag size={18} style={{ opacity: 0.5 }} />
                                                <input
                                                    type="text"
                                                    placeholder="e.g. backend"
                                                    required
                                                    value={formData.code}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                                                    style={{
                                                        padding: '0.75rem 0',
                                                        background: 'none',
                                                        border: 'none',
                                                        outline: 'none',
                                                        width: '100%',
                                                        color: 'inherit'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Description</label>
                                            <div className="glass flex items-start gap-2" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                                                <FileText size={18} style={{ opacity: 0.5, marginTop: '0.25rem' }} />
                                                <textarea
                                                    placeholder="Describe this work type..."
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        outline: 'none',
                                                        width: '100%',
                                                        color: 'inherit',
                                                        minHeight: '100px',
                                                        resize: 'none',
                                                        fontFamily: 'inherit'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <footer style={{
                                    padding: '1.5rem',
                                    borderTop: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '1rem',
                                    background: 'var(--background)'
                                }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={modalLoading}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                                        {modalLoading ? <Loader2 className="animate-spin" size={18} /> : (editingWorkType ? 'Update' : 'Save')}
                                    </button>
                                </footer>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default WorkTypeList;

import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, X, Trash2, Edit2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const WorkTypeList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                closeModal();
            }
        };
        if (isModalOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isModalOpen]);

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

            if (!formData.code.trim()) {
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
            width: '100%'
        }}>
            {/* Header */}
            <div style={{
                marginBottom: '32px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: '600',
                            letterSpacing: '-0.02em',
                            marginBottom: '4px',
                            color: 'var(--foreground)'
                        }}>
                            Work Types
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            fontWeight: '400'
                        }}>
                            Manage categories for billable work items
                        </p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                    >
                        <Plus size={16} />
                        Add Work Type
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    position: 'relative',
                    maxWidth: '400px'
                }}>
                    <Search size={16} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.4,
                        pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        placeholder="Search work types..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            fontSize: '15px',
                            fontFamily: 'inherit',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--foreground)',
                            outline: 'none',
                            transition: 'border-color 0.15s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#dc2626'
                }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Empty State */}
            {!error && filteredWorkTypes.length === 0 && !loading && (
                <div style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '48px 24px',
                    textAlign: 'center'
                }}>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        marginBottom: '20px'
                    }}>
                        {searchTerm ? 'No work types match your search.' : 'No work types found.'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => openModal()}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                fontFamily: 'inherit',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                        >
                            <Plus size={16} />
                            Create your first work type
                        </button>
                    )}
                </div>
            )}

            {/* Work Types List */}
            {filteredWorkTypes.length > 0 && (
                <div style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse'
                    }}>
                        <thead>
                            <tr style={{
                                backgroundColor: 'var(--background)',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em'
                                }}>
                                    Code
                                </th>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em'
                                }}>
                                    Description
                                </th>
                                <th style={{
                                    padding: '12px 16px',
                                    width: '100px',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    letterSpacing: '0.01em'
                                }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkTypes.map((wt, index) => (
                                <tr
                                    key={wt.id}
                                    style={{
                                        borderBottom: index < filteredWorkTypes.length - 1 ? '1px solid var(--border)' : 'none',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{
                                        padding: '14px 16px',
                                        fontSize: '15px',
                                        fontWeight: '500',
                                        color: 'var(--foreground)'
                                    }}>
                                        {wt.code}
                                    </td>
                                    <td style={{
                                        padding: '14px 16px',
                                        fontSize: '15px',
                                        color: 'var(--foreground)',
                                        opacity: 0.8
                                    }}>
                                        {wt.description || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No description</span>}
                                    </td>
                                    <td style={{
                                        padding: '14px 16px',
                                        textAlign: 'right'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            justifyContent: 'flex-end'
                                        }}>
                                            <button
                                                onClick={() => openModal(wt)}
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    fontFamily: 'inherit',
                                                    backgroundColor: 'transparent',
                                                    color: 'var(--foreground)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--border)'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                            >
                                                <Edit2 size={14} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(wt.id)}
                                                style={{
                                                    padding: '6px 10px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    fontFamily: 'inherit',
                                                    backgroundColor: 'transparent',
                                                    color: '#dc2626',
                                                    border: '1px solid rgba(220, 38, 38, 0.2)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'background-color 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                                                    e.target.style.borderColor = 'rgba(220, 38, 38, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = 'transparent';
                                                    e.target.style.borderColor = 'rgba(220, 38, 38, 0.2)';
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '24px'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            width: '100%',
                            maxWidth: '500px',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '90vh',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '600',
                                color: 'var(--foreground)'
                            }}>
                                {editingWorkType ? 'Edit Work Type' : 'Add Work Type'}
                            </h2>
                            <button
                                onClick={closeModal}
                                style={{
                                    padding: '6px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'opacity 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '1'}
                                onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ padding: '24px' }}>
                                {modalError && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 16px',
                                        marginBottom: '24px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: '#dc2626'
                                    }}>
                                        <AlertCircle size={16} />
                                        {modalError}
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '24px'
                                }}>
                                    {/* Code Field */}
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            marginBottom: '8px',
                                            color: 'var(--foreground)',
                                            letterSpacing: '0.01em'
                                        }}>
                                            Code <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. backend"
                                            required
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value.toLowerCase().trim() })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                fontSize: '15px',
                                                fontFamily: 'inherit',
                                                backgroundColor: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                color: 'var(--foreground)',
                                                outline: 'none',
                                                transition: 'border-color 0.15s ease'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                                        />
                                        <p style={{
                                            fontSize: '12px',
                                            color: 'var(--foreground)',
                                            opacity: 0.5,
                                            marginTop: '6px',
                                            lineHeight: '1.4'
                                        }}>
                                            Unique identifier for this work type
                                        </p>
                                    </div>

                                    {/* Description Field */}
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            marginBottom: '8px',
                                            color: 'var(--foreground)',
                                            letterSpacing: '0.01em'
                                        }}>
                                            Description
                                        </label>
                                        <textarea
                                            placeholder="Describe this work type..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                fontSize: '15px',
                                                fontFamily: 'inherit',
                                                backgroundColor: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                color: 'var(--foreground)',
                                                outline: 'none',
                                                resize: 'vertical',
                                                transition: 'border-color 0.15s ease',
                                                lineHeight: '1.5'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                                        />
                                        <p style={{
                                            fontSize: '12px',
                                            color: 'var(--foreground)',
                                            opacity: 0.5,
                                            marginTop: '6px',
                                            lineHeight: '1.4'
                                        }}>
                                            Optional. Brief description of what this work type represents.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                backgroundColor: 'var(--background)'
                            }}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={modalLoading}
                                    style={{
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        fontFamily: 'inherit',
                                        backgroundColor: 'transparent',
                                        color: 'var(--foreground)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        cursor: modalLoading ? 'not-allowed' : 'pointer',
                                        opacity: modalLoading ? 0.5 : 1,
                                        transition: 'background-color 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!modalLoading) {
                                            e.target.style.backgroundColor = 'var(--border)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!modalLoading) {
                                            e.target.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        fontFamily: 'inherit',
                                        backgroundColor: modalLoading ? 'var(--border)' : 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: modalLoading ? 'not-allowed' : 'pointer',
                                        transition: 'background-color 0.15s ease',
                                        opacity: modalLoading ? 0.7 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!modalLoading) {
                                            e.target.style.backgroundColor = 'var(--primary-hover)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!modalLoading) {
                                            e.target.style.backgroundColor = 'var(--primary)';
                                        }
                                    }}
                                >
                                    {modalLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Saving...
                                        </>
                                    ) : (
                                        editingWorkType ? 'Update' : 'Create'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkTypeList;

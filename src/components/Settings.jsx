import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const Settings = () => {
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const settings = await api.getSettings();
            setCompanyName(settings.company_name || '');
            setCompanyAddress(settings.company_address || '');
            setCompanyEmail(settings.company_email || '');
            setError(null);
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(false);

            await api.updateSettings({ 
                company_name: companyName,
                company_address: companyAddress,
                company_email: companyEmail
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
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
            maxWidth: '800px',
            width: '100%'
        }}>
            {/* Header */}
            <div style={{
                marginBottom: '32px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    letterSpacing: '-0.02em',
                    marginBottom: '4px',
                    color: 'var(--foreground)'
                }}>
                    Settings
                </h1>
                <p style={{
                    fontSize: '15px',
                    color: 'var(--foreground)',
                    opacity: 0.6,
                    fontWeight: '400'
                }}>
                    Manage your company information and preferences
                </p>
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

            {/* Success Message */}
            {success && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#059669'
                }}>
                    <CheckCircle size={16} />
                    Settings saved successfully
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                {/* Company Information Section */}
                <div style={{
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '32px'
                }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: '4px',
                            color: 'var(--foreground)'
                        }}>
                            Company Information
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--foreground)',
                            opacity: 0.6,
                            lineHeight: '1.5'
                        }}>
                            This information will appear on all invoices and documents
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '28px'
                    }}>
                        {/* Company Name */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                marginBottom: '8px',
                                color: 'var(--foreground)',
                                letterSpacing: '0.01em'
                            }}>
                                Company Name
                            </label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="Enter company name"
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
                                Optional. Leave blank to exclude from invoices.
                            </p>
                        </div>

                        {/* Company Address */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                marginBottom: '8px',
                                color: 'var(--foreground)',
                                letterSpacing: '0.01em'
                            }}>
                                Company Address
                            </label>
                            <textarea
                                value={companyAddress}
                                onChange={e => setCompanyAddress(e.target.value)}
                                placeholder="Enter full address"
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
                                Optional. Leave blank to exclude from invoices.
                            </p>
                        </div>

                        {/* Company Email */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                marginBottom: '8px',
                                color: 'var(--foreground)',
                                letterSpacing: '0.01em'
                            }}>
                                Company Email
                            </label>
                            <input
                                type="email"
                                value={companyEmail}
                                onChange={e => setCompanyEmail(e.target.value)}
                                placeholder="contact@company.com"
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
                                Optional. Leave blank to exclude from invoices.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '24px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border)'
                }}>
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            backgroundColor: saving ? 'var(--border)' : 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.15s ease',
                            opacity: saving ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!saving) {
                                e.target.style.backgroundColor = 'var(--primary-hover)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!saving) {
                                e.target.style.backgroundColor = 'var(--primary)';
                            }
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;

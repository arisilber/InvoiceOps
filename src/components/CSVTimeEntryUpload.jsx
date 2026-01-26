import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import api from '../services/api';
import { parseTimeToMinutes, formatDate, localDateStringToUtc } from '../utils/timeParser';

const CSVTimeEntryUpload = ({ onUploadComplete, clients, workTypes }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    // Parse CSV line handling quoted fields with commas
    const parseCSVLine = (line) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        values.push(current.trim());
        return values;
    };

    // Expected CSV format: client_name, work_type_code, project_name (optional), work_date, time_spent, detail
    const parseCSV = (text) => {
        // Normalize line endings (handle both \r\n and \n)
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        const requiredHeaders = ['client_name', 'work_type_code', 'work_date', 'time_spent'];
        
        // Check if all required headers are present
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        const entries = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '')); // Remove surrounding quotes
            if (values.length !== headers.length) {
                errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length} columns, got ${values.length})`);
                continue;
            }

            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
            });

            // Validate and transform
            const validationError = validateRow(row, i + 1);
            if (validationError) {
                errors.push(validationError);
                continue;
            }

            // Find client_id and work_type_id
            const client = clients.find(c => c.name.toLowerCase() === row.client_name.toLowerCase());
            const workType = workTypes.find(wt => wt.code.toLowerCase() === row.work_type_code.toLowerCase());

            if (!client) {
                errors.push(`Row ${i + 1}: Client "${row.client_name}" not found`);
                continue;
            }

            if (!workType) {
                errors.push(`Row ${i + 1}: Work type "${row.work_type_code}" not found`);
                continue;
            }

            // Parse time_spent (can be minutes, HH:MM format, or decimal hours)
            // This will round up to nearest 5 minutes
            const minutes_spent = parseTimeToMinutes(row.time_spent);

            if (minutes_spent <= 0) {
                errors.push(`Row ${i + 1}: Invalid time_spent value`);
                continue;
            }

            // Parse date (accept YYYY-MM-DD or MM/DD/YYYY)
            let work_date = row.work_date;
            if (work_date.includes('/')) {
                const [month, day, year] = work_date.split('/');
                work_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Convert local date to UTC before submitting to backend
            const utcDate = localDateStringToUtc(work_date);

            entries.push({
                client_id: client.id,
                work_type_id: workType.id,
                project_name: row.project_name || '',
                work_date: utcDate,
                minutes_spent: minutes_spent,
                detail: row.detail || null
            });
        }

        if (errors.length > 0) {
            throw new Error(`Validation errors:\n${errors.join('\n')}`);
        }

        return entries;
    };

    const validateRow = (row, rowNum) => {
        if (!row.client_name) return `Row ${rowNum}: client_name is required`;
        if (!row.work_type_code) return `Row ${rowNum}: work_type_code is required`;
        if (!row.work_date) return `Row ${rowNum}: work_date is required`;
        if (!row.time_spent) return `Row ${rowNum}: time_spent is required`;

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const dateRegexAlt = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
        if (!dateRegex.test(row.work_date) && !dateRegexAlt.test(row.work_date)) {
            return `Row ${rowNum}: Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY`;
        }

        return null;
    };

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.csv')) {
            setError('Please select a CSV file');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setSuccess(null);

        try {
            const text = await selectedFile.text();
            const entries = parseCSV(text);
            setPreview(entries);
        } catch (err) {
            setError(err.message);
            setPreview(null);
        }
    };

    const handleUpload = async () => {
        if (!preview || preview.length === 0) return;

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await api.bulkUploadTimeEntries(preview);
            
            if (result.error_count > 0) {
                // Partial success
                const errorMessages = result.errors?.map(e => `Row ${e.index + 1}: ${e.error}`).join('\n') || '';
                setError(`Uploaded ${result.success_count} entries, but ${result.error_count} failed:\n${errorMessages}`);
                if (result.success_count > 0) {
                    // Still show success message
                    setSuccess(`Successfully uploaded ${result.success_count} time entries`);
                }
            } else {
                // Full success
                setSuccess(`Successfully uploaded ${result.success_count} time entries`);
            }
            
            if (result.success_count > 0) {
                setFile(null);
                setPreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                if (onUploadComplete) {
                    onUploadComplete();
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to upload time entries');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = `client_name,work_type_code,project_name,work_date,time_spent,detail
Acme Corp,DEV,Website Redesign,2024-01-15,120,Implemented new homepage layout
Acme Corp,DEV,Website Redesign,2024-01-16,0.75,Added contact form functionality
Tech Solutions,CONS,API Integration,2024-01-17,1:30,Integrated payment gateway
Tech Solutions,DEV,,2024-01-18,90,Fixed bug in authentication`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'time_entries_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        setSuccess(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="card glass" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Bulk Upload Time Entries</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Upload a CSV file to import multiple time entries at once</p>
                </div>
                <button
                    onClick={handleDownloadTemplate}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Download size={16} />
                    Download Template
                </button>
            </div>

            {!file && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '3rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.background = 'rgba(0, 122, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                >
                    <Upload size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Click to select CSV file</p>
                    <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>CSV format: client_name, work_type_code, project_name (optional), work_date, time_spent, detail</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.25rem' }}>Time can be minutes (90), hours:minutes (1:30), or decimal hours (0.75). Rounds up to nearest 5 minutes.</p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            whiteSpace: 'pre-wrap'
                        }}
                    >
                        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, fontSize: '0.875rem' }}>{error}</div>
                    </motion.div>
                )}

                {success && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: 'var(--radius-md)',
                            color: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}
                    >
                        <Check size={20} />
                        <div style={{ fontSize: '0.875rem' }}>{success}</div>
                    </motion.div>
                )}

                {preview && preview.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ marginTop: '1.5rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Preview ({preview.length} entries)</p>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Review the entries before uploading</p>
                            </div>
                            <button
                                onClick={handleClear}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--foreground)',
                                    opacity: 0.7
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: 'rgba(255, 255, 255, 0.05)', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Client</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Work Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Project</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Date</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 10).map((entry, idx) => {
                                        const client = clients.find(c => c.id === entry.client_id);
                                        const workType = workTypes.find(wt => wt.id === entry.work_type_id);
                                        const hours = Math.floor(entry.minutes_spent / 60);
                                        const minutes = entry.minutes_spent % 60;
                                        return (
                                            <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{client?.name || 'N/A'}</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{workType?.code || 'N/A'}</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{entry.project_name}</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{formatDate(entry.work_date)}</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                                    {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {preview.length > 10 && (
                                <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', opacity: 0.6, borderTop: '1px solid var(--border)' }}>
                                    ... and {preview.length - 10} more entries
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={handleUpload}
                                className="btn btn-primary"
                                disabled={uploading}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Upload {preview.length} Entries
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleClear}
                                className="btn btn-secondary"
                                disabled={uploading}
                                style={{ background: 'transparent', border: '1px solid var(--border)' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CSVTimeEntryUpload;


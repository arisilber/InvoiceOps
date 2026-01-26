import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Check, AlertCircle, Loader2, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';
import { localDateStringToUtc } from '../utils/timeParser';

const LegacyDataImport = ({ onImportComplete }) => {
    const [importType, setImportType] = useState('invoices'); // 'invoices', 'payments', or 'time-entries'
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setSuccess(null);
        setResults(null);

        try {
            const text = await selectedFile.text();
            let data;

            // Try to parse as JSON
            try {
                data = JSON.parse(text);
            } catch (jsonError) {
                // If not JSON, try CSV
                data = parseCSV(text);
            }

            // Validate structure
            if (importType === 'invoices') {
                if (!data.invoices || !Array.isArray(data.invoices)) {
                    throw new Error('JSON must have an "invoices" array');
                }
                validateInvoices(data.invoices);
            } else if (importType === 'payments') {
                if (!data.payments || !Array.isArray(data.payments)) {
                    throw new Error('JSON must have a "payments" array');
                }
                validatePayments(data.payments);
            } else {
                if (!data.time_entries || !Array.isArray(data.time_entries)) {
                    throw new Error('JSON must have a "time_entries" array');
                }
                validateTimeEntries(data.time_entries);
            }

            setPreview(data);
        } catch (err) {
            setError(err.message);
            setPreview(null);
        }
    };

    const parseCSV = (text) => {
        // Basic CSV parsing for invoices
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        if (importType === 'invoices') {
            const invoices = [];
            const invoiceMap = new Map();

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });

                const invoiceNumber = parseInt(row.invoice_number);
                if (!invoiceMap.has(invoiceNumber)) {
                    invoiceMap.set(invoiceNumber, {
                        invoice_number: invoiceNumber,
                        client_name: row.client_name,
                        invoice_date: row.invoice_date,
                        due_date: row.due_date || row.invoice_date,
                        status: row.status || 'draft',
                        subtotal_cents: parseInt(row.subtotal_cents || 0),
                        discount_cents: parseInt(row.discount_cents || 0),
                        total_cents: parseInt(row.total_cents || 0),
                        lines: []
                    });
                }

                const invoice = invoiceMap.get(invoiceNumber);
                invoice.lines.push({
                    work_type_code: row.work_type_code,
                    project_name: row.project_name || '',
                    total_minutes: parseInt(row.total_minutes || 0),
                    hourly_rate_cents: parseInt(row.hourly_rate_cents || 0),
                    amount_cents: parseInt(row.amount_cents || 0),
                    description: row.description || null
                });
            }

            return { invoices: Array.from(invoiceMap.values()) };
        } else if (importType === 'payments') {
            // Payments CSV parsing
            const payments = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });

                payments.push({
                    payment_date: row.payment_date,
                    amount_cents: parseInt(row.amount_cents),
                    note: row.note || null,
                    applications: row.invoice_number ? [{
                        invoice_number: parseInt(row.invoice_number),
                        amount_cents: parseInt(row.amount_cents)
                    }] : []
                });
            }

            return { payments };
        } else {
            // Time entries CSV parsing
            const timeEntries = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });

                // Convert local date to UTC before submitting
                const utcDate = localDateStringToUtc(row.work_date);

                timeEntries.push({
                    client_name: row.client_name,
                    work_type_code: row.work_type_code,
                    project_name: row.project_name || '',
                    work_date: utcDate,
                    minutes_spent: parseInt(row.minutes_spent),
                    detail: row.detail || null,
                    invoice_number: row.invoice_number ? parseInt(row.invoice_number) : null
                });
            }

            return { time_entries: timeEntries };
        }
    };

    const validateInvoices = (invoices) => {
        for (let i = 0; i < invoices.length; i++) {
            const inv = invoices[i];
            if (!inv.invoice_number || !inv.client_name || !inv.invoice_date || !inv.due_date) {
                throw new Error(`Invoice ${i + 1}: Missing required fields (invoice_number, client_name, invoice_date, due_date)`);
            }
            if (inv.lines && Array.isArray(inv.lines)) {
                for (let j = 0; j < inv.lines.length; j++) {
                    const line = inv.lines[j];
                    if (!line.work_type_code) {
                        throw new Error(`Invoice ${i + 1}, Line ${j + 1}: Missing work_type_code`);
                    }
                }
            }
        }
    };

    const validatePayments = (payments) => {
        for (let i = 0; i < payments.length; i++) {
            const pay = payments[i];
            if (!pay.payment_date || !pay.amount_cents) {
                throw new Error(`Payment ${i + 1}: Missing required fields (payment_date, amount_cents)`);
            }
        }
    };

    const validateTimeEntries = (timeEntries) => {
        for (let i = 0; i < timeEntries.length; i++) {
            const entry = timeEntries[i];
            if (!entry.client_name || !entry.work_type_code || !entry.work_date || !entry.minutes_spent) {
                throw new Error(`Time Entry ${i + 1}: Missing required fields (client_name, work_type_code, work_date, minutes_spent)`);
            }
            if (isNaN(parseInt(entry.minutes_spent)) || parseInt(entry.minutes_spent) <= 0) {
                throw new Error(`Time Entry ${i + 1}: minutes_spent must be a positive number`);
            }
        }
    };

    const handleImport = async () => {
        if (!preview) return;

        setImporting(true);
        setError(null);
        setSuccess(null);
        setResults(null);

        try {
            let result;
            if (importType === 'invoices') {
                result = await api.importLegacyInvoices(preview.invoices);
            } else if (importType === 'payments') {
                result = await api.importLegacyPayments(preview.payments);
            } else {
                result = await api.importLegacyTimeEntries(preview.time_entries);
            }

            setResults(result);
            if (result.error_count > 0) {
                setError(`Imported ${result.success_count} ${importType.replace('-', ' ')}, but ${result.error_count} failed. See details below.`);
            } else {
                setSuccess(`Successfully imported ${result.success_count} ${importType.replace('-', ' ')}`);
            }

            if (result.success_count > 0 && onImportComplete) {
                onImportComplete();
            }
        } catch (err) {
            setError(err.message || `Failed to import ${importType.replace('-', ' ')}`);
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        let template;
        let filename;

        if (importType === 'invoices') {
            filename = 'legacy_invoices_template.json';
            template = JSON.stringify({
                invoices: [
                    {
                        invoice_number: 1,
                        client_name: "Acme Corp",
                        invoice_date: "2024-01-15",
                        due_date: "2024-02-15",
                        status: "paid",
                        subtotal_cents: 100000,
                        discount_cents: 0,
                        total_cents: 100000,
                        lines: [
                            {
                                work_type_code: "frontend",
                                project_name: "Website Redesign",
                                total_minutes: 1200,
                                hourly_rate_cents: 10000,
                                amount_cents: 200000,
                                description: "Implemented new homepage layout"
                            }
                        ]
                    }
                ]
            }, null, 2);
        } else if (importType === 'payments') {
            filename = 'legacy_payments_template.json';
            template = JSON.stringify({
                payments: [
                    {
                        payment_date: "2024-02-20",
                        amount_cents: 100000,
                        note: "Payment received via bank transfer",
                        applications: [
                            {
                                invoice_number: 1,
                                amount_cents: 100000
                            }
                        ]
                    }
                ]
            }, null, 2);
        } else {
            filename = 'legacy_time_entries_template.json';
            template = JSON.stringify({
                time_entries: [
                    {
                        client_name: "Acme Corp",
                        work_type_code: "frontend",
                        project_name: "Website Redesign",
                        work_date: "2024-01-15",
                        minutes_spent: 120,
                        detail: "Implemented new homepage layout",
                        invoice_number: 1
                    },
                    {
                        client_name: "Acme Corp",
                        work_type_code: "backend",
                        project_name: "API Development",
                        work_date: "2024-01-16",
                        minutes_spent: 90,
                        detail: "Added user authentication endpoint"
                    }
                ]
            }, null, 2);
        }

        const blob = new Blob([template], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
        setResults(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatCurrency = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    return (
        <div className="card glass" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Import Legacy Data</h3>
                    <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Import historical invoices and payments from before using this system</p>
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

            {/* Import Type Selector */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={() => {
                        setImportType('invoices');
                        handleClear();
                    }}
                    className={importType === 'invoices' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ flex: 1 }}
                >
                    Import Invoices
                </button>
                <button
                    onClick={() => {
                        setImportType('payments');
                        handleClear();
                    }}
                    className={importType === 'payments' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ flex: 1 }}
                >
                    Import Payments
                </button>
                <button
                    onClick={() => {
                        setImportType('time-entries');
                        handleClear();
                    }}
                    className={importType === 'time-entries' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ flex: 1 }}
                >
                    Import Time Entries
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
                    <FileJson size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Click to select JSON or CSV file</p>
                    <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                        {importType === 'invoices' 
                            ? 'Format: JSON with "invoices" array, or CSV with invoice data'
                            : importType === 'payments'
                            ? 'Format: JSON with "payments" array, or CSV with payment data'
                            : 'Format: JSON with "time_entries" array, or CSV with time entry data'}
                    </p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
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

                {preview && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ marginTop: '1.5rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                    Preview ({importType === 'invoices' ? preview.invoices?.length : importType === 'payments' ? preview.payments?.length : preview.time_entries?.length} {importType.replace('-', ' ')})
                                </p>
                                <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Review the data before importing</p>
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
                            maxHeight: '400px',
                            overflowY: 'auto',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '1rem'
                        }}>
                            <pre style={{ 
                                fontSize: '0.75rem', 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {JSON.stringify(preview, null, 2).substring(0, 2000)}
                                {JSON.stringify(preview, null, 2).length > 2000 ? '\n... (truncated)' : ''}
                            </pre>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={handleImport}
                                className="btn btn-primary"
                                disabled={importing}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Import {importType === 'invoices' ? preview.invoices?.length : importType === 'payments' ? preview.payments?.length : preview.time_entries?.length} {importType.replace('-', ' ')}
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleClear}
                                className="btn btn-secondary"
                                disabled={importing}
                                style={{ background: 'transparent', border: '1px solid var(--border)' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}

                {results && results.errors && results.errors.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#ef4444' }}>
                            Import Errors ({results.errors.length})
                        </p>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {results.errors.map((err, idx) => (
                                <div key={idx} style={{ 
                                    fontSize: '0.875rem', 
                                    marginBottom: '0.5rem',
                                    padding: '0.5rem',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    <strong>Item {err.index + 1}:</strong> {err.error}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LegacyDataImport;

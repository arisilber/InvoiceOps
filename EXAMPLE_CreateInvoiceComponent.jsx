/**
 * Example React component for creating invoices from time entries
 * 
 * This demonstrates how to integrate the invoice creation service
 * into your frontend application.
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

export default function CreateInvoiceFromTimeEntries() {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [preview, setPreview] = useState(null);
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load clients and next invoice number on mount
    useEffect(() => {
        loadClients();
        loadNextInvoiceNumber();
    }, []);

    const loadClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (err) {
            console.error('Error loading clients:', err);
        }
    };

    const loadNextInvoiceNumber = async () => {
        try {
            const response = await api.get('/invoices/next-invoice-number');
            setNextInvoiceNumber(response.data.next_invoice_number);
        } catch (err) {
            console.error('Error loading next invoice number:', err);
        }
    };

    const handlePreview = async () => {
        if (!selectedClient || !startDate || !endDate) {
            setError('Please select a client and date range');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/invoices/preview-from-time-entries', {
                client_id: parseInt(selectedClient),
                start_date: startDate,
                end_date: endDate
            });

            setPreview(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Error previewing invoice');
            setPreview(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvoice = async () => {
        if (!selectedClient || !startDate || !endDate || !invoiceDate || !dueDate) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/invoices/from-time-entries', {
                client_id: parseInt(selectedClient),
                start_date: startDate,
                end_date: endDate,
                invoice_number: nextInvoiceNumber,
                invoice_date: invoiceDate,
                due_date: dueDate
            });

            // Success! Navigate to invoice detail or show success message
            console.log('Invoice created:', response.data);
            alert(`Invoice #${response.data.invoice_number} created successfully!`);

            // Reset form
            setSelectedClient('');
            setStartDate('');
            setEndDate('');
            setInvoiceDate('');
            setDueDate('');
            setPreview(null);
            loadNextInvoiceNumber();

        } catch (err) {
            setError(err.response?.data?.error || 'Error creating invoice');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (cents) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    };

    const formatMinutes = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="create-invoice-container">
            <h2>Create Invoice from Time Entries</h2>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="form-section">
                <div className="form-group">
                    <label htmlFor="client">Client *</label>
                    <select
                        id="client"
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Select a client...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="startDate">Start Date *</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="endDate">End Date *</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>

                <button
                    onClick={handlePreview}
                    disabled={loading || !selectedClient || !startDate || !endDate}
                    className="btn-preview"
                >
                    {loading ? 'Loading...' : 'Preview Invoice'}
                </button>
            </div>

            {preview && (
                <div className="preview-section">
                    <h3>Invoice Preview</h3>

                    <div className="preview-summary">
                        <p><strong>Client:</strong> {preview.client.name}</p>
                        <p><strong>Total Entries:</strong> {preview.total_entries}</p>
                        <p><strong>Date Range:</strong> {preview.date_range.start} to {preview.date_range.end}</p>
                    </div>

                    <table className="preview-lines">
                        <thead>
                            <tr>
                                <th>Work Type</th>
                                <th>Project</th>
                                <th>Time</th>
                                <th>Entries</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.lines.map((line, idx) => (
                                <tr key={idx}>
                                    <td>{line.work_type_description}</td>
                                    <td>{line.project_name || '(no project)'}</td>
                                    <td>{formatMinutes(line.total_minutes)}</td>
                                    <td>{line.entry_count}</td>
                                    <td>{formatCurrency(line.amount_cents)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="4"><strong>Subtotal</strong></td>
                                <td><strong>{formatCurrency(preview.subtotal_cents)}</strong></td>
                            </tr>
                            {preview.discount_cents > 0 && (
                                <tr>
                                    <td colSpan="4">Discount ({preview.client.discount_percent}%)</td>
                                    <td>-{formatCurrency(preview.discount_cents)}</td>
                                </tr>
                            )}
                            <tr className="total-row">
                                <td colSpan="4"><strong>Total</strong></td>
                                <td><strong>{formatCurrency(preview.total_cents)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="invoice-details-section">
                        <h4>Invoice Details</h4>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="invoiceNumber">Invoice Number</label>
                                <input
                                    type="number"
                                    id="invoiceNumber"
                                    value={nextInvoiceNumber || ''}
                                    readOnly
                                    disabled
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="invoiceDate">Invoice Date *</label>
                                <input
                                    type="date"
                                    id="invoiceDate"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="dueDate">Due Date *</label>
                                <input
                                    type="date"
                                    id="dueDate"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreateInvoice}
                            disabled={loading || !invoiceDate || !dueDate}
                            className="btn-create"
                        >
                            {loading ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Example CSS for styling (add to your CSS file)
 */
const exampleCSS = `
.create-invoice-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.form-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.btn-preview,
.btn-create {
  background-color: #4CAF50;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-preview:hover,
.btn-create:hover {
  background-color: #45a049;
}

.btn-preview:disabled,
.btn-create:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.preview-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.preview-summary {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.preview-lines {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}

.preview-lines th,
.preview-lines td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.preview-lines thead th {
  background-color: #f5f5f5;
  font-weight: 600;
}

.preview-lines tfoot {
  font-weight: 500;
}

.total-row {
  border-top: 2px solid #333;
  font-size: 1.1rem;
}

.invoice-details-section {
  border-top: 2px solid #eee;
  padding-top: 2rem;
  margin-top: 2rem;
}
`;

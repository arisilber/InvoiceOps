import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Printer, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const formatDateInput = (date) => date.toISOString().split('T')[0];

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  // Accept either "YYYY-MM-DD" or an ISO timestamp like "YYYY-MM-DDTHH:mm:ss.sssZ"
  const normalized = String(dateStr);
  const date = normalized.includes('T') ? new Date(normalized) : new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatCurrency = (cents) => {
  const amount = (cents || 0) / 100;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const StatementView = () => {
  const { clientId } = useParams();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(clientId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(formatDateInput(firstDay));
    setEndDate(formatDateInput(lastDay));
  }, []);

  useEffect(() => {
    setSelectedClientId(clientId || '');
  }, [clientId]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const data = await api.getClients();
        setClients(data);
      } catch (err) {
        console.error('Error loading clients:', err);
        setError('Failed to load clients.');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const selectedClient = useMemo(() => {
    return clients.find(client => String(client.id) === String(selectedClientId));
  }, [clients, selectedClientId]);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!selectedClientId) {
      setError('Please select a client.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select a start and end date.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      const data = await api.getStatement(selectedClientId, startDate, endDate);
      setStatement(data);
    } catch (err) {
      console.error('Error generating statement:', err);
      setError(err.message || 'Failed to generate statement.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!statement) return;
    try {
      setActionLoading('pdf');
      setError(null);
      await api.downloadStatementPDF(selectedClientId, startDate, endDate);
    } catch (err) {
      console.error('Error downloading statement PDF:', err);
      setError(err.message || 'Failed to download statement PDF.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = async () => {
    if (!statement) return;
    try {
      setActionLoading('print');
      setError(null);
      const html = await api.getStatementHTML(selectedClientId, startDate, endDate);
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please allow popups.');
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    } catch (err) {
      console.error('Error printing statement:', err);
      setError(err.message || 'Failed to print statement.');
    } finally {
      setActionLoading(null);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div className="flex items-start gap-2" style={{ alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Customer Statement
            </h1>
            <p style={{ fontSize: '15px', opacity: 0.6 }}>
              {selectedClient?.name || 'Select a client'} • {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
            disabled={!statement || actionLoading}
          >
            {actionLoading === 'print' ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
            Print
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPDF}
            disabled={!statement || actionLoading}
          >
            {actionLoading === 'pdf' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Download PDF
          </button>
        </div>
      </header>

      <form
        className="card"
        onSubmit={handleGenerate}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}
      >
        <div className="flex flex-col gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Client</label>
          <select
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            required
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'inherit',
              outline: 'none'
            }}
          >
            <option value="">Select Client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'inherit',
              outline: 'none'
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'inherit',
              outline: 'none'
            }}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? <Loader2 className="animate-spin" size={16} /> : 'Generate Statement'}
          </button>
        </div>
      </form>

      {error && (
        <div className="card" style={{ borderColor: 'var(--error)', color: 'var(--error-text)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
            <AlertCircle size={18} />
            <strong>Error</strong>
          </div>
          <p>{error}</p>
        </div>
      )}

      {!statement && !error && (
        <div className="card" style={{ textAlign: 'center', opacity: 0.7 }}>
          Generate a statement to view transactions and balances.
        </div>
      )}

      {statement && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>
                Customer
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{statement.client_name}</div>
              {statement.client_email && (
                <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>{statement.client_email}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>
                Period
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {formatDisplayDate(statement.start_date)} – {formatDisplayDate(statement.end_date)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>
                Ending Balance
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(statement.ending_balance_cents)}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--border)' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Document</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Amount</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                  <td style={{ padding: '0.75rem' }}>{formatDisplayDate(statement.start_date)}</td>
                  <td style={{ padding: '0.75rem' }}>—</td>
                  <td style={{ padding: '0.75rem' }}>—</td>
                  <td style={{ padding: '0.75rem' }}>Beginning Balance</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(statement.beginning_balance_cents)}
                  </td>
                </tr>
                {statement.transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>
                      No transactions during this period.
                    </td>
                  </tr>
                )}
                {statement.transactions.map((transaction) => (
                  <tr key={`${transaction.type}-${transaction.document_number}-${transaction.date}`}>
                    <td style={{ padding: '0.75rem' }}>{formatDisplayDate(transaction.date)}</td>
                    <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{transaction.type}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{transaction.document_number}</td>
                    <td style={{ padding: '0.75rem' }}>{transaction.description}</td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      color: transaction.amount_cents < 0 ? '#16a34a' : 'inherit'
                    }}>
                      {formatCurrency(transaction.amount_cents)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {formatCurrency(transaction.running_balance_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <table style={{ width: '320px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0.75rem', opacity: 0.7 }}>Beginning Balance</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                    {formatCurrency(statement.beginning_balance_cents)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0.75rem', opacity: 0.7 }}>Invoices</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                    {formatCurrency(statement.period_invoices_total_cents)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0.75rem', opacity: 0.7 }}>Payments</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                    -{formatCurrency(statement.period_payments_total_cents)}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <td style={{ padding: '0.75rem' }}>Ending Balance</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {formatCurrency(statement.ending_balance_cents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementView;

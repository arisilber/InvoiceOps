import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { getInvoiceHTMLBlobURL } from '../utils/htmlGenerator';
import api from '../services/api';

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [htmlUrl, setHtmlUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    // Cleanup blob URL when component unmounts
    return () => {
      if (htmlUrl) {
        URL.revokeObjectURL(htmlUrl);
      }
    };
  }, [htmlUrl]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInvoice(id);
      setInvoice(data);
      
      // Generate HTML blob URL for preview
      const url = getInvoiceHTMLBlobURL(data);
      setHtmlUrl(url);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (invoice) {
      try {
        await api.downloadInvoicePDF(invoice.id);
      } catch (err) {
        console.error('Error downloading PDF:', err);
        setError('Failed to download PDF');
      }
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 4rem)',
          gap: '1rem',
          color: 'var(--foreground)'
        }}
      >
        <Loader2 className="animate-spin" size={48} style={{ opacity: 0.7 }} />
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem 2.5rem',
          width: '100%'
        }}
      >
        <div className="flex flex-col gap-6">
          <button
            className="btn btn-secondary"
            onClick={handleBack}
            style={{ alignSelf: 'flex-start' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div
            className="card"
            style={{
              borderColor: 'var(--error)',
              color: 'var(--error-text)',
              padding: '1.5rem'
            }}
          >
            {error}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1.5rem 2.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div>
          <button
            className="btn btn-secondary"
            onClick={handleBack}
            style={{
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            Invoice Preview
          </h1>
          <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
            INV-{invoice.invoice_number} - {invoice.client_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </header>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#525252',
          padding: '2rem',
          position: 'relative'
        }}
      >
        {error && (
          <div
            className="card"
            style={{
              borderColor: 'var(--error)',
              color: 'var(--error-text)',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            {error}
          </div>
        )}

        {!error && htmlUrl && (
          <iframe
            src={htmlUrl}
            style={{
              width: '100%',
              maxWidth: '900px',
              height: '100%',
              minHeight: '600px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'white',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            title="HTML Invoice Preview"
          />
        )}
      </div>
    </motion.div>
  );
};

export default InvoiceView;

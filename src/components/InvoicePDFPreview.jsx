import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2 } from 'lucide-react';
import { getInvoiceHTMLBlobURL } from '../utils/htmlGenerator';
import api from '../services/api';

const InvoicePDFPreview = ({ isOpen, onClose, invoice }) => {
  const [htmlUrl, setHtmlUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && invoice) {
      setLoading(true);
      setError(null);
      try {
        const url = getInvoiceHTMLBlobURL(invoice);
        setHtmlUrl(url);
      } catch (err) {
        console.error('Error generating HTML:', err);
        setError('Failed to generate HTML preview');
      } finally {
        setLoading(false);
      }
    }

    // Cleanup: revoke blob URL when component unmounts or modal closes
    return () => {
      if (htmlUrl) {
        URL.revokeObjectURL(htmlUrl);
        setHtmlUrl(null);
      }
    };
  }, [isOpen, invoice]);

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            background: 'var(--background)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          <header
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--card-bg)'
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                Invoice Preview
              </h2>
              {invoice && (
                <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
                  INV-{invoice.invoice_number} - {invoice.client_name}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {invoice && (
                <button
                  className="btn btn-primary"
                  onClick={handleDownload}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={18} />
                  Download PDF
                </button>
              )}
              <button
                className="btn btn-secondary"
                style={{ padding: '0.5rem' }}
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>
          </header>

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
            {loading && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  color: 'var(--foreground)'
                }}
              >
                <Loader2 className="animate-spin" size={48} style={{ opacity: 0.7 }} />
                <p>Generating HTML preview...</p>
              </div>
            )}

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

            {!loading && !error && htmlUrl && (
              <iframe
                src={htmlUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '600px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: 'white'
                }}
                title="HTML Invoice Preview"
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InvoicePDFPreview;


import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { setAuthHelpers } from './services/api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import ClientList from './components/ClientList';
import NewInvoiceModal from './components/NewInvoiceModal';
import NewClientModal from './components/NewClientModal';
import TimeEntryList from './components/TimeEntryList';
import WorkTypeList from './components/WorkTypeList';
import Login from './components/Login';
import Register from './components/Register';

function App() {
  const { user, loading, getAuthHeaders, refreshAccessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Set up API helpers
  useEffect(() => {
    setAuthHelpers({
      getAuthHeaders,
      refreshAccessToken,
      logout,
    });
  }, [getAuthHeaders, refreshAccessToken, logout]);

  // Refresh signals
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const [clientRefreshKey, setClientRefreshKey] = useState(0);

  const handleInvoiceCreated = () => {
    setInvoiceRefreshKey(prev => prev + 1);
  };

  const handleClientAdded = () => {
    setClientRefreshKey(prev => prev + 1);
    setEditingClient(null);
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const openEditClientModal = (client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--background)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ opacity: 0.7 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!user) {
    // Only allow registration in development
    const allowRegistration = import.meta.env.DEV;
    
    if (showRegister && allowRegistration) {
      return <Register onSwitchToLogin={() => setShowRegister(false)} />;
    }
    
    return (
      <Login 
        onSwitchToRegister={allowRegistration ? () => setShowRegister(true) : undefined} 
      />
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        onNewInvoice={() => setIsModalOpen(true)}
      />

      <main style={{
        marginLeft: '280px',
        width: 'calc(100% - 280px)',
        minHeight: '100vh',
        paddingTop: '2rem'
      }}>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard
                key={invoiceRefreshKey}
                onExploreInvoices={() => navigate('/invoices')}
              />
            } 
          />
          <Route path="/dashboard" element={<Dashboard key={invoiceRefreshKey} onExploreInvoices={() => navigate('/invoices')} />} />
          <Route path="/invoices" element={<InvoiceList key={invoiceRefreshKey} />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route 
            path="/clients" 
            element={
              <ClientList
                key={clientRefreshKey}
                onNewClient={openNewClientModal}
                onEditClient={openEditClientModal}
              />
            } 
          />
          <Route path="/time-entry" element={<TimeEntryList />} />
          <Route path="/work-types" element={<WorkTypeList />} />
          <Route 
            path="/settings" 
            element={
              <div className="card">
                <h2>Settings</h2>
                <p style={{ opacity: 0.7 }}>Settings coming soon...</p>
              </div>
            } 
          />
        </Routes>
      </main>

      <NewInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInvoiceCreated={handleInvoiceCreated}
      />

      <NewClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        onClientAdded={handleClientAdded}
        initialData={editingClient}
      />
    </div>
  );
}

export default App;

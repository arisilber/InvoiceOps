import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, PlusCircle, Clock, Tag, LogOut, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ onNewInvoice }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'invoices', label: 'Invoices', icon: FileText, path: '/invoices' },
    { id: 'payments', label: 'Payments', icon: DollarSign, path: '/payments' },
    { id: 'time-entry', label: 'Time Tracking', icon: Clock, path: '/time-entry' },
    { id: 'clients', label: 'Clients', icon: Users, path: '/clients' },
    { id: 'work-types', label: 'Work Types', icon: Tag, path: '/work-types' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="glass" style={{
      width: '260px',
      height: 'calc(100vh - 2rem)',
      margin: '1rem',
      borderRadius: 'var(--radius-lg)',
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
    }}>
      <div style={{ padding: '0 1rem 2rem' }}>
        <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <FileText size={20} />
          </div>
          InvoiceOps
        </h1>
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
          return (
            <Link
              key={item.id}
              to={item.path}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--foreground)',
                marginBottom: '0.5rem',
                opacity: isActive ? 1 : 0.7,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onNewInvoice}>
          <PlusCircle size={20} />
          New Invoice
        </button>

        {user && (
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border)',
            marginTop: '1rem',
            paddingTop: '1rem',
          }}>
            <div style={{
              fontSize: '0.875rem',
              opacity: 0.7,
              marginBottom: '0.5rem',
            }}>
              {user.name}
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{
                width: '100%',
                fontSize: '0.875rem',
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

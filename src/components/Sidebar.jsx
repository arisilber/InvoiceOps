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

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside style={{
      width: '240px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 1000,
    }}
    className="sidebar-container"
    >
      {/* Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--border)',
        minHeight: '72px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'var(--foreground)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--background)',
            flexShrink: 0,
          }}>
            <FileText size={16} />
          </div>
          <h1 style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--foreground)',
            letterSpacing: '-0.01em',
            margin: 0,
            fontFamily: 'var(--font-sans)',
          }}>
            InvoiceOps
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '12px 8px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                marginBottom: '2px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--foreground)',
                opacity: active ? 1 : 0.65,
                backgroundColor: active ? 'var(--border)' : 'transparent',
                fontWeight: active ? 500 : 400,
                fontSize: '14px',
                lineHeight: '20px',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'var(--border)';
                  e.currentTarget.style.opacity = '0.85';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.65';
                }
              }}
            >
              {active && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '3px',
                  height: '20px',
                  backgroundColor: 'var(--foreground)',
                  borderRadius: '0 2px 2px 0',
                }} />
              )}
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div style={{
        padding: '12px 8px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <button
          onClick={onNewInvoice}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'var(--foreground)',
            color: 'var(--background)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <PlusCircle size={18} />
          New Invoice
        </button>

        {user && (
          <div style={{
            padding: '12px 8px 8px',
          }}>
            <div style={{
              fontSize: '13px',
              color: 'var(--foreground)',
              opacity: 0.5,
              fontWeight: 500,
              marginBottom: '8px',
              paddingLeft: '4px',
              fontFamily: 'var(--font-sans)',
            }}>
              {user.name}
            </div>
            <button
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
                opacity: 0.65,
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 400,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--border)';
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.65';
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

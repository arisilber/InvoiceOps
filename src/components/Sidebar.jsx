import React from 'react';
import { LayoutDashboard, FileText, Users, Settings, PlusCircle, Clock, Tag } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onNewInvoice }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'time-entry', label: 'Time Tracking', icon: Clock },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'work-types', label: 'Work Types', icon: Tag },
    { id: 'settings', label: 'Settings', icon: Settings },
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
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--foreground)',
                marginBottom: '0.5rem',
                opacity: isActive ? 1 : 0.7,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }} onClick={onNewInvoice}>
        <PlusCircle size={20} />
        New Invoice
      </button>
    </aside>
  );
};

export default Sidebar;

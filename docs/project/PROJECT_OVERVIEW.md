# InvoiceOps Project Overview

**InvoiceOps** is a premium, high-performance invoice management application built with Vite and React. It is designed for modern businesses that require a sleek, fast, and intuitive interface for tracking billing, managing clients, and generating invoices.

## 🚀 Technology Stack

- **Framework**: [React 19](https://react.dev/) via [Vite](https://vitejs.dev/)
- **State Management**: React Hooks (`useState`, `useEffect`)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Utilities**: [date-fns](https://date-fns.org/)
- **Styling**: Vanilla CSS with custom Design Tokens (CSS Variables)
- **Fonts**: Outfit (Headings) & Inter (Body) via Google Fonts

## ✨ Key Features

### 1. Unified Dashboard
- **Financial Pulse**: Real-time overview of Revenue, Pending, Paid, and Overdue totals.
- **Trend Indicators**: Visual indicators for growth/decline percentages.
- **Recent Activity**: A feed of the latest billing events.

### 2. Invoice Management
- **Tabular View**: List of all invoices with status-coded badges.
- **Smart Filters**: Search by Invoice ID or Client.
- **New Invoice Flow**: Comprehensive modal for creating invoices with multi-item support.

### 3. Client Directory
- **Customer Cards**: visual "business card" style layout for client data.
- **Billing History**: High-level stats showing total billed per customer.
- **Management**: Easy interface for adding and searching clients.

### 4. Time Tracking & Billable Workflow
- **Capture Work**: Log time entries with client association, work type, and detailed notes.
- **Invoicing Integration**: Track which time entries have been billed and which are still pending.
- **Status Badges**: Visual indicators (Invoiced vs. Uninvoiced) for all logged work.
- **Advanced Filtering**: Filter entries by client, date range, work type, and invoicing status.

### 5. Premium UI/UX
- **Glassmorphism**: Elegant use of blur effects and transparency.
- **Responsive Layout**: Sidebar-driven navigation optimized for desktop productivity.
- **Dark Mode Ready**: Design tokens configured for consistent appearance across themes.

## 📂 Project Structure

```text
InvoiceOps/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Sidebar.jsx
│   │   ├── Dashboard.jsx
│   │   ├── InvoiceList.jsx
│   │   ├── ClientList.jsx
│   │   ├── NewInvoiceModal.jsx
│   │   └── NewClientModal.jsx
│   ├── App.jsx          # Main application shell and routing
│   ├── index.css        # Global design system and utilities
│   └── main.jsx         # Entry point
├── index.html           # HTML template with SEO/Fonts
└── package.json         # Dependencies and scripts
```

# Component Documentation

This document describes the primary components implemented in InvoiceOps and their responsibilities.

## 🏗️ Core Layout

### `Sidebar.jsx`
The primary navigation controller.
- **Props**: `activeTab`, `setActiveTab`, `onNewInvoice`.
- **Features**: 
  - Dynamic active states for links.
  - Quick action button for universal invoice creation.
  - Premium branding section.

### `App.jsx`
The application root and orchestrator.
- **State**: Manages `activeTab` (routing), `isModalOpen` (invoice creation), and `isClientModalOpen` (client creation).
- **Layout**: Implements the fixed sidebar and scrollable main content area.

## 📊 Feature Components

### `Dashboard.jsx`
The landing view for the application.
- **Sub-components**: `StatCard`.
- **Logic**: Calculates and displays financial summaries.
- **Animations**: Entrance staggered y-axis glide.

### `InvoiceList.jsx`
Table-based view for invoice tracking.
- **Columns**: ID, Client, Amount, Date, Status.
- **States**: Paid (Green), Pending (Yellow), Overdue (Red).
- **Actions**: Search, Download, Edit.

### `ClientList.jsx`
Grid-based view for customer management.
- **Layout**: Responsive grid of cards.
- **Features**: Search filtering, Client avatars, Location/Contact summary.

### `TimeEntryList.jsx`
Comprehensive view of all logged work.
- **Columns**: Date, Client & Project, Work Type, Duration, Status, Details.
- **Features**: 
  - Status badges showing "Invoiced" (with link to invoice #) or "Uninvoiced".
  - Advanced filters for Client, Work Type, Date Range, and Invoice Status.
  - Inline actions for editing and deleting entries.

### `LogTimeEntry.jsx`
Dedicated interface for capturing billable hours.
- **Layout**: Clean, focused form with icon-integrated inputs.
- **Features**:
  - Intelligent duration parsing (e.g., "90" or "1:30").
  - Optional association with existing invoices.
  - "Save & Add Another" workflow for rapid logging.

### `WorkTypeList.jsx`
System configuration for categorizing work.
- **Goal**: Manage standardized work codes (e.g., "frontend", "design").
- **Features**: Add/Edit/Delete work types with usage checking.

## 🪟 Modals

### `NewInvoiceModal.jsx`
- **Goal**: Complex form for invoice entry.
- **Fields**: Client selection, Date, and a dynamic "Items" list.
- **UX**: Backdrop blur and scale-up animation.

### `NewClientModal.jsx`
- **Goal**: Customer onboarding.
- **Fields**: Company name, Email, Phone, Website, and Address (textarea).
- **Design**: Icon-integrated inputs for better affordance.

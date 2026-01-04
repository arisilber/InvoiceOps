const API_BASE_URL = 'http://localhost:4567/api';

const api = {
    // Clients
    getClients: async () => {
        const response = await fetch(`${API_BASE_URL}/clients`);
        if (!response.ok) throw new Error('Failed to fetch clients');
        return response.json();
    },
    getClient: async (id) => {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`);
        if (!response.ok) throw new Error('Failed to fetch client');
        return response.json();
    },
    createClient: async (clientData) => {
        const response = await fetch(`${API_BASE_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create client');
        }
        return response.json();
    },
    updateClient: async (id, clientData) => {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData),
        });
        if (!response.ok) throw new Error('Failed to update client');
        return response.json();
    },
    deleteClient: async (id) => {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete client');
        return response.json();
    },

    // Invoices
    getInvoices: async () => {
        const response = await fetch(`${API_BASE_URL}/invoices`);
        if (!response.ok) throw new Error('Failed to fetch invoices');
        return response.json();
    },
    getInvoice: async (id) => {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
        if (!response.ok) throw new Error('Failed to fetch invoice');
        return response.json();
    },
    getNextInvoiceNumber: async () => {
        const response = await fetch(`${API_BASE_URL}/invoices/next-invoice-number`);
        if (!response.ok) throw new Error('Failed to fetch next invoice number');
        const data = await response.json();
        return data.next_invoice_number;
    },
    createInvoice: async (invoiceData) => {
        const response = await fetch(`${API_BASE_URL}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create invoice');
        }
        return response.json();
    },
    previewInvoiceFromTimeEntries: async (clientId, startDate, endDate) => {
        const response = await fetch(`${API_BASE_URL}/invoices/preview-from-time-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                start_date: startDate,
                end_date: endDate
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to preview invoice');
        }
        return response.json();
    },
    createInvoiceFromTimeEntries: async (invoiceData) => {
        const response = await fetch(`${API_BASE_URL}/invoices/from-time-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: invoiceData.client_id,
                start_date: invoiceData.start_date,
                end_date: invoiceData.end_date,
                invoice_number: invoiceData.invoice_number,
                invoice_date: invoiceData.invoice_date,
                due_date: invoiceData.due_date
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create invoice from time entries');
        }
        return response.json();
    },

    // Work Types
    getWorkTypes: async () => {
        const response = await fetch(`${API_BASE_URL}/work-types`);
        if (!response.ok) throw new Error('Failed to fetch work types');
        return response.json();
    },
    createWorkType: async (workTypeData) => {
        const response = await fetch(`${API_BASE_URL}/work-types`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workTypeData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create work type');
        }
        return response.json();
    },
    updateWorkType: async (id, workTypeData) => {
        const response = await fetch(`${API_BASE_URL}/work-types/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workTypeData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update work type');
        }
        return response.json();
    },
    deleteWorkType: async (id) => {
        const response = await fetch(`${API_BASE_URL}/work-types/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete work type');
        }
        return response.json();
    },

    // Time Entries
    getTimeEntries: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_BASE_URL}/time-entries?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch time entries');
        return response.json();
    },
    createTimeEntry: async (entryData) => {
        const response = await fetch(`${API_BASE_URL}/time-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
        });
        if (!response.ok) throw new Error('Failed to create time entry');
        return response.json();
    },
    updateTimeEntry: async (id, entryData) => {
        const response = await fetch(`${API_BASE_URL}/time-entries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
        });
        if (!response.ok) throw new Error('Failed to update time entry');
        return response.json();
    },
    deleteTimeEntry: async (id) => {
        const response = await fetch(`${API_BASE_URL}/time-entries/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete time entry');
        return response.json();
    },

    // Payments
    getPayments: async () => {
        const response = await fetch(`${API_BASE_URL}/payments`);
        if (!response.ok) throw new Error('Failed to fetch payments');
        return response.json();
    },
    createPayment: async (paymentData) => {
        const response = await fetch(`${API_BASE_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData),
        });
        if (!response.ok) throw new Error('Failed to create payment');
        return response.json();
    }
};

export default api;

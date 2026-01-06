const API_BASE_URL = '/api';

// Helper function to make authenticated requests with automatic token refresh
let getAuthHeaders = null;
let refreshAccessToken = null;
let logout = null;

export const setAuthHelpers = (helpers) => {
    getAuthHeaders = helpers.getAuthHeaders;
    refreshAccessToken = helpers.refreshAccessToken;
    logout = helpers.logout;
};

const makeRequest = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if available
    if (getAuthHeaders) {
        const authHeaders = await getAuthHeaders();
        if (authHeaders) {
            Object.assign(headers, authHeaders);
        }
    }

    let response = await fetch(url, {
        ...options,
        headers,
    });

    // If token expired (401) or forbidden (403), try to refresh and retry once
    if ((response.status === 401 || response.status === 403) && refreshAccessToken) {
        try {
            const newToken = await refreshAccessToken();
            if (newToken) {
                // Retry with new token
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, {
                    ...options,
                    headers,
                });
            }
        } catch (error) {
            // Refresh failed, logout user
            if (logout) {
                logout();
            }
            throw new Error('Session expired. Please log in again.');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
};

const api = {
    // Clients
    getClients: async () => {
        return makeRequest(`${API_BASE_URL}/clients`);
    },
    getClient: async (id) => {
        return makeRequest(`${API_BASE_URL}/clients/${id}`);
    },
    getClientDashboard: async (id) => {
        return makeRequest(`${API_BASE_URL}/clients/${id}/dashboard`);
    },
    createClient: async (clientData) => {
        return makeRequest(`${API_BASE_URL}/clients`, {
            method: 'POST',
            body: JSON.stringify(clientData),
        });
    },
    updateClient: async (id, clientData) => {
        return makeRequest(`${API_BASE_URL}/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData),
        });
    },
    deleteClient: async (id) => {
        return makeRequest(`${API_BASE_URL}/clients/${id}`, {
            method: 'DELETE',
        });
    },

    // Invoices
    getInvoices: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) {
            params.append('status', filters.status);
        }
        if (filters.client_id) {
            params.append('client_id', filters.client_id);
        }
        const queryString = params.toString();
        const url = queryString ? `${API_BASE_URL}/invoices?${queryString}` : `${API_BASE_URL}/invoices`;
        return makeRequest(url);
    },
    getInvoice: async (id) => {
        return makeRequest(`${API_BASE_URL}/invoices/${id}`);
    },
    getNextInvoiceNumber: async () => {
        const data = await makeRequest(`${API_BASE_URL}/invoices/next-invoice-number`);
        return data.next_invoice_number;
    },
    createInvoice: async (invoiceData) => {
        return makeRequest(`${API_BASE_URL}/invoices`, {
            method: 'POST',
            body: JSON.stringify(invoiceData),
        });
    },
    previewInvoiceFromTimeEntries: async (clientId, startDate, endDate) => {
        return makeRequest(`${API_BASE_URL}/invoices/preview-from-time-entries`, {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                start_date: startDate,
                end_date: endDate
            }),
        });
    },
    generateLineDescription: async (timeEntries, workTypeDescription, projectName = '') => {
        const data = await makeRequest(`${API_BASE_URL}/invoices/generate-line-description`, {
            method: 'POST',
            body: JSON.stringify({
                time_entries: timeEntries,
                work_type_description: workTypeDescription,
                project_name: projectName
            }),
        });
        return data.description;
    },
    createInvoiceFromTimeEntries: async (invoiceData) => {
        return makeRequest(`${API_BASE_URL}/invoices/from-time-entries`, {
            method: 'POST',
            body: JSON.stringify({
                client_id: invoiceData.client_id,
                start_date: invoiceData.start_date,
                end_date: invoiceData.end_date,
                invoice_number: invoiceData.invoice_number,
                invoice_date: invoiceData.invoice_date,
                due_date: invoiceData.due_date
            }),
        });
    },
    updateInvoice: async (id, invoiceData) => {
        return makeRequest(`${API_BASE_URL}/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData),
        });
    },
    markInvoiceAsSent: async (id) => {
        // Fetch current invoice to preserve other fields
        const invoice = await makeRequest(`${API_BASE_URL}/invoices/${id}`);
        return makeRequest(`${API_BASE_URL}/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                invoice_date: invoice.invoice_date,
                due_date: invoice.due_date,
                status: 'sent',
                subtotal_cents: invoice.subtotal_cents,
                discount_cents: invoice.discount_cents,
                total_cents: invoice.total_cents
            }),
        });
    },
    markInvoiceAsDraft: async (id) => {
        // Fetch current invoice to preserve other fields
        const invoice = await makeRequest(`${API_BASE_URL}/invoices/${id}`);
        return makeRequest(`${API_BASE_URL}/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                invoice_date: invoice.invoice_date,
                due_date: invoice.due_date,
                status: 'draft',
                subtotal_cents: invoice.subtotal_cents,
                discount_cents: invoice.discount_cents,
                total_cents: invoice.total_cents
            }),
        });
    },
    deleteInvoice: async (id) => {
        return makeRequest(`${API_BASE_URL}/invoices/${id}`, {
            method: 'DELETE',
        });
    },
    updateInvoiceLineDescription: async (lineId, description) => {
        return makeRequest(`${API_BASE_URL}/invoices/lines/${lineId}/description`, {
            method: 'PUT',
            body: JSON.stringify({ description }),
        });
    },

    // Work Types
    getWorkTypes: async () => {
        return makeRequest(`${API_BASE_URL}/work-types`);
    },
    createWorkType: async (workTypeData) => {
        return makeRequest(`${API_BASE_URL}/work-types`, {
            method: 'POST',
            body: JSON.stringify(workTypeData),
        });
    },
    updateWorkType: async (id, workTypeData) => {
        return makeRequest(`${API_BASE_URL}/work-types/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workTypeData),
        });
    },
    deleteWorkType: async (id) => {
        return makeRequest(`${API_BASE_URL}/work-types/${id}`, {
            method: 'DELETE',
        });
    },

    // Time Entries
    getTimeEntries: async (filters = {}) => {
        const params = new URLSearchParams(filters);
        return makeRequest(`${API_BASE_URL}/time-entries?${params.toString()}`);
    },
    createTimeEntry: async (entryData) => {
        return makeRequest(`${API_BASE_URL}/time-entries`, {
            method: 'POST',
            body: JSON.stringify(entryData),
        });
    },
    bulkUploadTimeEntries: async (entries) => {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (getAuthHeaders) {
            const authHeaders = await getAuthHeaders();
            if (authHeaders) {
                Object.assign(headers, authHeaders);
            }
        }

        let response = await fetch(`${API_BASE_URL}/time-entries/bulk`, {
            method: 'POST',
            headers,
            body: JSON.stringify(entries),
        });

        // Handle token refresh if needed
        if ((response.status === 401 || response.status === 403) && refreshAccessToken) {
            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    response = await fetch(`${API_BASE_URL}/time-entries/bulk`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(entries),
                    });
                }
            } catch (error) {
                if (logout) {
                    logout();
                }
                throw new Error('Session expired. Please log in again.');
            }
        }

        // Handle 207 (Multi-Status) for partial success
        if (response.status === 207) {
            const data = await response.json();
            return data;
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `Request failed with status ${response.status}`);
        }

        return response.json();
    },
    updateTimeEntry: async (id, entryData) => {
        return makeRequest(`${API_BASE_URL}/time-entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entryData),
        });
    },
    deleteTimeEntry: async (id) => {
        return makeRequest(`${API_BASE_URL}/time-entries/${id}`, {
            method: 'DELETE',
        });
    },

    // Payments
    getPayments: async () => {
        return makeRequest(`${API_BASE_URL}/payments`);
    },
    getPayment: async (id) => {
        return makeRequest(`${API_BASE_URL}/payments/${id}`);
    },
    createPayment: async (paymentData) => {
        return makeRequest(`${API_BASE_URL}/payments`, {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    },
    deletePayment: async (id) => {
        return makeRequest(`${API_BASE_URL}/payments/${id}`, {
            method: 'DELETE',
        });
    }
};

export default api;

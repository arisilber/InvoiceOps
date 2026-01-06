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
    getInvoices: async () => {
        return makeRequest(`${API_BASE_URL}/invoices`);
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
    createPayment: async (paymentData) => {
        return makeRequest(`${API_BASE_URL}/payments`, {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }
};

export default api;

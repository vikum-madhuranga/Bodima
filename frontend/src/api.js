/**
 * API Service for Bodima Finder & Tenant Manager
 * Connects to PHP Built-in Server at http://localhost:8000
 */

const API_BASE_URL = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;
  
  const defaultHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      throw new Error(`Server returned non-JSON response (HTTP ${response.status}). Please verify that PHP backend is running at http://localhost:8000.`);
    }

    if (!response.ok || data.success === false) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${config.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Dashboard
  getDashboard: () => request('dashboard.php'),

  // Owners
  getOwners: () => request('owners.php'),
  getOwner: (id) => request(`owners.php?id=${id}`),
  createOwner: (data) => request('owners.php', { method: 'POST', body: JSON.stringify(data) }),
  updateOwner: (data) => request('owners.php', { method: 'PUT', body: JSON.stringify(data) }),
  deleteOwner: (id) => request(`owners.php?id=${id}`, { method: 'DELETE' }),

  // Properties
  getProperties: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`properties.php${query ? '?' + query : ''}`);
  },
  getProperty: (id) => request(`properties.php?id=${id}`),
  createProperty: (data) => request('properties.php', { method: 'POST', body: JSON.stringify(data) }),
  updateProperty: (data) => request('properties.php', { method: 'PUT', body: JSON.stringify(data) }),
  deleteProperty: (id) => request(`properties.php?id=${id}`, { method: 'DELETE' }),

  // Rooms
  getRooms: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`rooms.php${query ? '?' + query : ''}`);
  },
  getRoom: (id) => request(`rooms.php?id=${id}`),
  createRoom: (data) => request('rooms.php', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (data) => request('rooms.php', { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id) => request(`rooms.php?id=${id}`, { method: 'DELETE' }),

  // Tenants
  getTenants: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`tenants.php${query ? '?' + query : ''}`);
  },
  getTenant: (id) => request(`tenants.php?id=${id}`),
  createTenant: (data) => request('tenants.php', { method: 'POST', body: JSON.stringify(data) }),
  updateTenant: (data) => request('tenants.php', { method: 'PUT', body: JSON.stringify(data) }),
  deleteTenant: (id) => request(`tenants.php?id=${id}`, { method: 'DELETE' }),

  // Monthly Payments
  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`payments.php${query ? '?' + query : ''}`);
  },
  getPayment: (id) => request(`payments.php?id=${id}`),
  createPayment: (data) => request('payments.php', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (data) => request('payments.php', { method: 'PUT', body: JSON.stringify(data) }),
  deletePayment: (id) => request(`payments.php?id=${id}`, { method: 'DELETE' }),
};

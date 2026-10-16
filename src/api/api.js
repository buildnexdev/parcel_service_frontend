import axios from 'axios';

// Create Axios client with base URL pointing to /api (proxied in Vite or direct)
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('es_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/public/')) {
        localStorage.removeItem('es_token');
        localStorage.removeItem('es_user');
        window.dispatchEvent(new Event('auth_logout'));
      }
    }
    const msg = error.response?.data?.message || error.message || 'API Request failed';
    return Promise.reject(new Error(msg));
  }
);

export const api = {
  // Auth
  login: (username, password) => apiClient.post('/auth/login', { username, password }),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) => apiClient.put('/auth/change-password', { currentPassword, newPassword }),

  // Public
  trackParcel: (query) => apiClient.get(`/public/track/${encodeURIComponent(query)}`),
  getBranches: () => apiClient.get('/public/branches'),
  getCompanyInfo: () => apiClient.get('/public/company'),
  submitInquiry: (data) => apiClient.post('/public/inquiry', data),

  // Drivers
  getDrivers: (params = {}) => apiClient.get('/drivers', { params }),
  createDriver: (data) => apiClient.post('/drivers', data),
  updateDriver: (id, data) => apiClient.put(`/drivers/${id}`, data),
  deleteDriver: (id) => apiClient.delete(`/drivers/${id}`),

  // Orders
  getOrders: (params = {}) => apiClient.get('/orders', { params }),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  createOrder: (data) => apiClient.post('/orders', data),
  updatePayment: (id, data) => apiClient.patch(`/orders/${id}/payment`, data),
  updateDeliveryStatus: (id, data) => apiClient.patch(`/orders/${id}/status`, data),
  addCheckpoint: (id, data) => apiClient.post(`/orders/${id}/checkpoint`, data),
  deleteOrder: (id) => apiClient.delete(`/orders/${id}`),

  // Reports
  getDailyReport: (params = {}) => apiClient.get('/reports/daily', { params }),
  getDashboardSummary: () => apiClient.get('/reports/summary')
};

export default api;

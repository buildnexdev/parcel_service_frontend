import axios from 'axios';

// Determine API Base URL:
// 1. If VITE_API_URL is configured (e.g. in Vercel environment variables), use it.
// 2. In production (Vercel deployment), point to live Render backend: https://igr-parcel-service.onrender.com/api
// 3. In local development, use /api (proxied by Vite to localhost:5000)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const customUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return customUrl.endsWith('/api') ? customUrl : `${customUrl}/api`;
  }
  if (import.meta.env.PROD) {
    return 'https://igr-parcel-service.onrender.com/api';
  }
  return '/api';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
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

  // Staff & Team
  getStaff: (params = {}) => apiClient.get('/staff', { params }),
  getStaffById: (id) => apiClient.get(`/staff/${id}`),
  createStaff: (data) => apiClient.post('/staff', data),
  updateStaff: (id, data) => apiClient.put(`/staff/${id}`, data),
  deleteStaff: (id) => apiClient.delete(`/staff/${id}`),
  resetStaffPassword: (id, newPassword) => apiClient.put(`/staff/${id}/reset-password`, { newPassword }),

  // Drivers
  getDrivers: (params = {}) => apiClient.get('/drivers', { params }),
  createDriver: (data) => apiClient.post('/drivers', data),
  updateDriver: (id, data) => apiClient.put(`/drivers/${id}`, data),
  deleteDriver: (id) => apiClient.delete(`/drivers/${id}`),

  // Vehicles / Fleet
  getVehicles: (params = {}) => apiClient.get('/vehicles', { params }),
  getVehicleById: (id) => apiClient.get(`/vehicles/${id}`),
  createVehicle: (data) => apiClient.post('/vehicles', data),
  updateVehicle: (id, data) => apiClient.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => apiClient.delete(`/vehicles/${id}`),

  // Orders
  getOrders: (params = {}) => apiClient.get('/orders', { params }),
  getNextWaybillNumber: (params = {}) => apiClient.get('/orders/next-waybill', { params }),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  createOrder: (data) => apiClient.post('/orders', data),
  updateOrder: (id, data) => apiClient.put(`/orders/${id}`, data),
  updatePayment: (id, data) => apiClient.patch(`/orders/${id}/payment`, data),
  updateDeliveryStatus: (id, data) => apiClient.patch(`/orders/${id}/status`, data),
  addCheckpoint: (id, data) => apiClient.post(`/orders/${id}/checkpoint`, data),
  deleteOrder: (id) => apiClient.delete(`/orders/${id}`),

  // Reports
  getDailyReport: (params = {}) => apiClient.get('/reports/daily', { params }),
  getDashboardSummary: () => apiClient.get('/reports/summary')
};

export default api;

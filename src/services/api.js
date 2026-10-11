import { apiClient } from './apiClient';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('cura_token');
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('cura_token');
    }
    const error = new Error(data?.message || 'Request failed');
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  login: (email, password) => apiClient.login(email, password),
  signup: (userData) => apiClient.signup(userData),
  logout: () => apiClient.logout(),
  getCurrentUser: () => apiClient.getCurrentUser(),
  updateProfile: (userId, updates) => apiClient.updateProfile(userId, updates),
  changePassword: (userId, currentPassword, newPassword) => apiClient.changePassword(userId, currentPassword, newPassword),
  getPatients: (filters) => apiClient.getPatients(filters),
  getPatientById: (id) => apiClient.getPatientById(id),
  createPatient: (data) => apiClient.createPatient(data),

  // Test routes connected to apiClient
  getTests: (filters) => apiClient.getTests(filters),
  getTestById: (id) => apiClient.getTestById(id),
  createTest: (data) => apiClient.createTest(data),
  updateClinicianReview: (id, reviewData) => apiClient.updateClinicianReview(id, reviewData),
  getBatchSummary: (batch) => apiClient.getBatchSummary(batch),

  // Dashboard stats connected to apiClient
  getDashboardStats: () => apiClient.getDashboardStats()
};

export default api;

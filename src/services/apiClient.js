/**
 * Centralized API client for Cura POCT Urinalysis Portal.
 * Connects React frontend to Express backend via Vite proxy (/api).
 */

const TOKEN_KEY = 'cura_token';

export function getToken() {
  const raw = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
  return raw ? String(raw).replace(/^["']|["']$/g, '').trim() : null;
}

export function setToken(token) {
  if (token) {
    const cleaned = String(token).replace(/^["']|["']$/g, '').trim();
    localStorage.setItem(TOKEN_KEY, cleaned);
    localStorage.removeItem('token');
  } else {
    clearToken();
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('token');
}

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

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const requestHeaders = {
    ...headers
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  // Handle 204 No Content or empty responses safely
  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => '');
    data = text ? { message: text } : null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    const message = data?.message || (res.statusText ? `Request failed: ${res.statusText}` : 'Request failed');
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  getToken,
  setToken,
  clearToken,

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data?.token) {
      setToken(data.token);
    }
    return data?.user || data;
  },

  async signup(userData) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: userData
    });
    if (data?.token) {
      setToken(data.token);
    }
    return data?.user || data;
  },

  async logout() {
    clearToken();
    return true;
  },

  async getCurrentUser() {
    const token = getToken();
    if (!token) {
      return null;
    }

    try {
      return await request('/auth/me');
    } catch (error) {
      if (error.status === 401) {
        clearToken();
        return null;
      }
      throw error;
    }
  },

  async changePassword(arg1, arg2, arg3) {
    let currentPassword = arg1;
    let newPassword = arg2;
    if (arg3 !== undefined) {
      // Supports changePassword(userId, currentPassword, newPassword)
      currentPassword = arg2;
      newPassword = arg3;
    }
    return request('/auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword }
    });
  },

  async updateProfile(userId, updates) {
    return request(`/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: updates
    });
  },

  async getPatients(filters = {}) {
    return request(`/patients${buildQuery(filters)}`);
  },

  async getPatientById(id) {
    return request(`/patients/${encodeURIComponent(id)}`);
  },

  async createPatient(data) {
    return request('/patients', {
      method: 'POST',
      body: data
    });
  },

  async createTest(data) {
    return request('/tests', {
      method: 'POST',
      body: data
    });
  },

  async getTests(filters = {}) {
    return request(`/tests${buildQuery(filters)}`);
  },

  async getTestById(id) {
    return request(`/tests/${encodeURIComponent(id)}`);
  },

  async updateClinicianReview(id, { status, notes }) {
    return request(`/tests/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: { status, notes }
    });
  },

  async getBatchSummary(batchNumber) {
    return request(`/tests/batches/${encodeURIComponent(batchNumber)}`);
  },

  async getDashboardStats() {
    return request('/stats/dashboard');
  }
};

export default apiClient;

const TOKEN_KEY = 'cura_token';

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
  const token = localStorage.getItem(TOKEN_KEY);
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
      localStorage.removeItem(TOKEN_KEY);
    }
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  async signup(userData) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: userData
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    return true;
  },

  async getCurrentUser() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return null;
    }

    try {
      return await request('/auth/me');
    } catch (error) {
      if (error.message.includes('401') || !localStorage.getItem(TOKEN_KEY)) {
        return null;
      }
      throw error;
    }
  },

  async updateProfile(userId, updates) {
    return request(`/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: updates
    });
  },

  async changePassword(userId, currentPassword, newPassword) {
    return request('/auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword }
    });
  },

  async getTests(filters = {}) {
    return request(`/tests${buildQuery(filters)}`);
  },

  async getTestById(id) {
    return request(`/tests/${encodeURIComponent(id)}`);
  },

  async createTest(data) {
    return request('/tests', {
      method: 'POST',
      body: data
    });
  },

  async updateClinicianReview(id, { status, notes }) {
    return request(`/tests/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: { status, notes }
    });
  },

  async getBatchSummary(batch) {
    return request(`/tests/batches/${encodeURIComponent(batch)}`);
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

  async getDashboardStats() {
    return request('/stats/dashboard');
  }
};

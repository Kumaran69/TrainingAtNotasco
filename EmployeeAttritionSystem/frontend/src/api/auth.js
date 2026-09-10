import api from './axios';

export const authAPI = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),

  register: (email, password, full_name, role = 'admin') =>
    api.post('/api/auth/register', { email, password, full_name, role }),

  getMe: () => api.get('/api/auth/me'),
};

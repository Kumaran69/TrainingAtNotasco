import api from './axios';

export const employeesAPI = {
  list: (params = {}) => api.get('/api/employees/', { params }),

  get: (employeeId) => api.get(`/api/employees/${employeeId}`),

  create: (data) => api.post('/api/employees/', data),

  update: (employeeId, data) => api.put(`/api/employees/${employeeId}`, data),

  delete: (employeeId) => api.delete(`/api/employees/${employeeId}`),

  exportData: () =>
    api.get('/api/employees/data/export', { responseType: 'blob' }),

  importData: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/employees/data/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

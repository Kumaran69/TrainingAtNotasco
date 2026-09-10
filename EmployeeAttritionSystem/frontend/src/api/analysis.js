import api from './axios';

export const analysisAPI = {
  getDashboard: () => api.get('/api/analysis/dashboard'),
  getFullReport: () => api.get('/api/analysis/reports'),
  getDepartments: () => api.get('/api/analysis/departments'),
  getSalary: () => api.get('/api/analysis/salary'),
  getTopPaid: (limit = 5) => api.get(`/api/analysis/top-paid?limit=${limit}`),
  getLowSatisfaction: (threshold = 2.0) =>
    api.get(`/api/analysis/low-satisfaction?threshold=${threshold}`),
  getAttrition: () => api.get('/api/analysis/attrition'),
};

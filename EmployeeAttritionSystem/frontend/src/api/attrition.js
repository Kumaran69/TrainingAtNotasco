import api from './axios';

export const attritionAPI = {
  getRiskOverview: () => api.get('/api/attrition/risk'),
  getEmployeeRisk: (employeeId) => api.get(`/api/attrition/risk/${employeeId}`),
  recalculateAll: () => api.post('/api/attrition/recalculate'),
};

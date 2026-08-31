const API_BASE = '/api';

/**
 * Get JWT auth token
 */
export function getAuthToken() {
  return localStorage.getItem('payroll_token') || '';
}

/**
 * Set JWT auth token
 */
export function setAuthToken(token) {
  if (token) localStorage.setItem('payroll_token', token);
  else localStorage.removeItem('payroll_token');
}

/**
 * Universal fetch wrapper
 */
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    setAuthToken(null);
    window.location.href = '/login';
    throw new Error('로그인이 필요합니다.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  // Dashboard
  getDashboardSummary: (yearMonth) => request(`/dashboard/summary?year_month=${yearMonth}`),

  // Stores
  getStores: () => request('/stores'),
  getStore: (id) => request(`/stores/${id}`),
  createStore: (data) => request('/stores', { method: 'POST', body: JSON.stringify(data) }),
  updateStore: (id, data) => request(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStore: (id) => request(`/stores/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: (storeId) => request(`/employees${storeId ? `?store_id=${storeId}` : ''}`),
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
  unmaskRRN: (id) => request(`/employees/${id}/unmask-rrn`, { method: 'POST' }),

  // Attendance
  getAttendance: (employeeId, storeId, yearMonth) => request(`/attendance?year_month=${yearMonth}${employeeId ? `&employee_id=${employeeId}` : ''}${storeId ? `&store_id=${storeId}` : ''}`),
  saveDailyAttendance: (data) => request('/attendance/save-daily', { method: 'POST', body: JSON.stringify(data) }),
  quickFillAttendance: (data) => request('/attendance/quick-fill', { method: 'POST', body: JSON.stringify(data) }),
  uploadAttendanceExcel: async (formData) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}/attendance/upload-excel`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '업로드 실패');
    return data;
  },

  // Payroll
  calculatePayroll: (storeId, yearMonth, force = false) => request('/payroll/calculate', { method: 'POST', body: JSON.stringify({ store_id: storeId, year_month: yearMonth, force_recalculate: force }) }),
  getPayrollRun: (storeId, yearMonth) => request(`/payroll/run?store_id=${storeId}&year_month=${yearMonth}`),
  checkEmployee: (detailId, inspected) => request('/payroll/check-employee', { method: 'POST', body: JSON.stringify({ detail_id: detailId, inspected }) }),
  checkAllEmployees: (runId, inspected) => request('/payroll/check-all', { method: 'POST', body: JSON.stringify({ run_id: runId, inspected }) }),
  confirmPayroll: (runId) => request('/payroll/confirm', { method: 'POST', body: JSON.stringify({ run_id: runId }) }),
  reopenPayroll: (runId, reason) => request('/payroll/reopen', { method: 'POST', body: JSON.stringify({ run_id: runId, reason }) }),
  getPayrollHistory: (storeId) => request(`/payroll/history${storeId ? `?store_id=${storeId}` : ''}`),

  // Settings & Holidays
  getSettings: () => request('/settings'),
  saveSettings: (key, value, description) => request('/settings', { method: 'POST', body: JSON.stringify({ key, value, description }) }),
  getHolidays: (year, month) => request(`/holidays?year=${year}${month ? `&month=${month}` : ''}`),
  addHoliday: (data) => request('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  toggleHoliday: (data) => request('/holidays/toggle', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id) => request(`/holidays/${id}`, { method: 'DELETE' }),

  // Exports URLs
  getWageLedgerExcelUrl: (storeId, yearMonth) => `${API_BASE}/payroll/export/wage-ledger-excel?store_id=${storeId}&year_month=${yearMonth}`,
  getPayslipExcelUrl: (detailId) => `${API_BASE}/payroll/export/payslip-excel/${detailId}`
};

export default api;

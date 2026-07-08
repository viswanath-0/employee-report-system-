// Single source of truth for every backend call the UI makes.
import api from './axios'

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  activate: (data) => api.post('/auth/activate', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  requestAccess: (data) => api.post('/auth/request-access', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  managers: () => api.get('/auth/managers'),
}

export const configApi = {
  public: () => api.get('/config'),
}

export const reportsApi = {
  submit: (data) => api.post('/reports/submit', data),
  my: () => api.get('/reports/my'),
  byDate: (date) => api.get(`/reports/my/${date}`),
  resubmit: (id, data) => api.put(`/reports/${id}/resubmit`, data),
}

export const leaveApi = {
  apply: (data) => api.post('/leave/apply', data),
}

export const escalationApi = {
  create: (data) => api.post('/escalations', data),
  my: () => api.get('/escalations/my'),
}

export const filesApi = {
  upload: (file, onUploadProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
  },
}

export const notificationsApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export const managerApi = {
  stats: () => api.get('/manager/stats'),
  team: () => api.get('/manager/team'),
  employeeReports: (id) => api.get(`/manager/employee/${id}/reports`),
  pending: () => api.get('/manager/pending'),
  report: (id) => api.get(`/manager/report/${id}`),
  approve: (id) => api.put(`/manager/report/${id}/approve`),
  unapprove: (id, message) =>
    api.put(`/manager/report/${id}/unapprove`, { message: message ?? null }),
  feedback: (id, message) =>
    api.put(`/manager/report/${id}/feedback`, { message: message ?? '' }),
  leaves: () => api.get('/manager/leaves'),
  approveLeave: (id) => api.put(`/manager/leave/${id}/approve`),
  rejectLeave: (id) => api.put(`/manager/leave/${id}/reject`),
  escalations: () => api.get('/manager/escalations'),
  resolveEscalation: (id) => api.put(`/manager/escalation/${id}/resolve`),
}

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  employees: (search) => api.get('/admin/employees', { params: search ? { search } : {} }),
  managers: () => api.get('/admin/managers'),
  createDirectoryUser: (data) => api.post('/admin/directory', data),
  reopenReport: (id) => api.put(`/admin/report/${id}/reopen`),
  reassign: (id, managerId) => api.put(`/admin/employee/${id}/reassign`, { manager_id: managerId }),
  deactivate: (id) => api.delete(`/admin/employee/${id}`),
  reports: (params) => api.get('/admin/reports', { params }),
  exportReports: (params) => api.get('/admin/export/reports', { params, responseType: 'blob' }),
  departments: () => api.get('/admin/departments'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
}

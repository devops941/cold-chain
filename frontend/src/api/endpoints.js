import api from './client'

export const auth = {
  login: (payload) => api.post('/api/auth/login', payload).then((r) => r.data),
  register: (payload) => api.post('/api/auth/register', payload).then((r) => r.data),
  me: () => api.get('/api/auth/me').then((r) => r.data),
}

export const dashboard = {
  get: () => api.get('/api/dashboard').then((r) => r.data),
}

export const facilities = {
  list: (params) => api.get('/api/facilities', { params }).then((r) => r.data),
  create: (payload) => api.post('/api/facilities', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/api/facilities/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/facilities/${id}`),
}

export const products = {
  list: (params) => api.get('/api/products', { params }).then((r) => r.data),
  create: (payload) => api.post('/api/products', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/api/products/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/products/${id}`),
}

export const shipments = {
  list: (params) => api.get('/api/shipments', { params }).then((r) => r.data),
  get: (id) => api.get(`/api/shipments/${id}`).then((r) => r.data),
  telemetry: (id, params) =>
    api.get(`/api/shipments/${id}/telemetry`, { params }).then((r) => r.data),
  create: (payload) => api.post('/api/shipments', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/api/shipments/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/shipments/${id}`),
}

export const telemetry = {
  list: (params) => api.get('/api/telemetry', { params }).then((r) => r.data),
  create: (payload) => api.post('/api/telemetry', payload).then((r) => r.data),
}

export const alerts = {
  list: (params) => api.get('/api/alerts', { params }).then((r) => r.data),
  update: (id, payload) => api.patch(`/api/alerts/${id}`, payload).then((r) => r.data),
}

export const uploads = {
  list: () => api.get('/api/uploads').then((r) => r.data),
  upload: (kind, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/api/uploads?kind=${kind}`, form).then((r) => r.data)
  },
  template: (kind) => api.get(`/api/uploads/templates/${kind}`).then((r) => r.data),
}

export const analytics = {
  overview: (params) => api.get('/api/analytics/overview', { params }).then((r) => r.data),
}

import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL, timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('cc_token')
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
    }
    const detail = error.response?.data?.detail
    error.message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : error.message || 'Something went wrong'
    return Promise.reject(error)
  },
)

export default api

import axios from 'axios'

// Prefer VITE_API_URL (used in deployment); fall back to VITE_API_BASE_URL for local dev.
export const API_BASE =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_BASE })

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global 401 handling → clear session and bounce to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const path = window.location.pathname
      if (path !== '/login' && path !== '/create-account' && path !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

/** Build an absolute URL to an uploaded file. */
export function fileUrl(pathOrName) {
  if (!pathOrName) return ''
  if (pathOrName.startsWith('http')) return pathOrName
  if (pathOrName.startsWith('/files/')) return `${API_BASE}${pathOrName}`
  return `${API_BASE}/files/${pathOrName}`
}

export default api

import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '@/api/endpoints'

const AuthContext = createContext(null)

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)
  const [loading, setLoading] = useState(true)

  // Validate the stored token on boot
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((r) => {
        setUser(r.data)
        localStorage.setItem('user', JSON.stringify(r.data))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const persist = (data) => {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    return persist(data)
  }

  const register = async (payload) => {
    const { data } = await authApi.register(payload)
    return persist(data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/login'
  }

  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

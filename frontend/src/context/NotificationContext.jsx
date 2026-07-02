import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { notificationsApi } from '@/api/endpoints'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      setUnread(0)
      return
    }
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount(),
      ])
      setItems(list.data)
      setUnread(count.data.count)
    } catch {
      /* silent — bell is non-critical */
    }
  }, [user])

  useEffect(() => {
    refresh()
    if (!user) return
    const t = setInterval(refresh, 30000) // poll every 30s
    return () => clearInterval(t)
  }, [user, refresh])

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnread((u) => Math.max(0, u - 1))
    try {
      await notificationsApi.markRead(id)
    } catch {
      refresh()
    }
  }

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnread(0)
    try {
      await notificationsApi.markAllRead()
    } catch {
      refresh()
    }
  }

  return (
    <NotificationContext.Provider value={{ items, unread, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)

import { Bell, Menu, LogOut, ChevronDown, CheckCheck, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { Avatar } from '@/components/ui/avatar'
import { Popover } from '@/components/ui/popover'
import { relativeTime } from '@/utils/date'
import { cn } from '@/utils/cn'

export function Topbar({ title, onMenu }) {
  const { user, logout } = useAuth()
  const { items, unread, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()

  const profileLink = user?.role === 'admin' ? '/admin/settings' : `/${user?.role}/profile`

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Notifications */}
        <Popover
          panelClassName="w-80"
          trigger={
            <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          }
        >
          {({ close }) => (
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="text-sm font-semibold text-slate-900">Notifications</span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</p>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id)
                        if (n.link) navigate(n.link)
                        close()
                      }}
                      className={cn(
                        'flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50',
                        !n.is_read && 'bg-brand-50/40',
                      )}
                    >
                      <span className="text-sm font-medium text-slate-800">{n.title}</span>
                      {n.message && <span className="line-clamp-2 text-xs text-slate-500">{n.message}</span>}
                      <span className="text-[11px] text-slate-400">{relativeTime(n.created_at)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Popover>

        {/* User menu */}
        <Popover
          panelClassName="w-56"
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100">
              <Avatar name={user?.name} size="sm" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-slate-800">{user?.name}</p>
                <p className="text-[11px] capitalize leading-tight text-slate-400">{user?.role}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
          }
        >
          {({ close }) => (
            <div className="py-1">
              <div className="border-b border-slate-100 px-4 py-2">
                <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={() => { navigate(profileLink); close() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <User className="h-4 w-4" /> {user?.role === 'admin' ? 'Settings' : 'Profile settings'}
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  )
}

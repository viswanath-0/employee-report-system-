import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Send, CalendarOff, AlertTriangle, Settings,
  Users, ClipboardCheck, Inbox, Building2, UserCog, X,
} from 'lucide-react'
import { managerApi } from '@/api/endpoints'
import { cn } from '@/utils/cn'

export const NAV = {
  employee: [
    { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/employee/reports', label: 'My Reports', icon: FileText },
    { to: '/employee/submit', label: 'Submit Report', icon: Send },
    { to: '/employee/leave', label: 'Leave Application', icon: CalendarOff },
    { to: '/employee/escalations', label: 'Escalations', icon: AlertTriangle },
    { to: '/employee/profile', label: 'Profile Settings', icon: Settings },
  ],
  manager: [
    { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/manager/team', label: 'Team Reports', icon: Users },
    { to: '/manager/approvals', label: 'Pending Approvals', icon: ClipboardCheck, badge: 'pending' },
    { to: '/manager/leaves', label: 'Leave Requests', icon: CalendarOff },
    { to: '/manager/escalations', label: 'Escalations Inbox', icon: Inbox, badge: 'escalations' },
    { to: '/manager/profile', label: 'Profile Settings', icon: Settings },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/employees', label: 'All Employees', icon: Users },
    { to: '/admin/managers', label: 'All Managers', icon: UserCog },
    { to: '/admin/reports', label: 'All Reports', icon: FileText },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
}

export function Sidebar({ role, companyName = 'Employee Report', open, onClose }) {
  const items = NAV[role] || []
  const [badges, setBadges] = useState({ pending: 0, escalations: 0 })

  useEffect(() => {
    if (role !== 'manager') return
    managerApi
      .stats()
      .then((r) => setBadges({ pending: r.data.pending_approvals, escalations: r.data.pending_escalations }))
      .catch(() => {})
  }, [role])

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-slate-900/50 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-slate-300 transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <img src="/logo.svg" alt="logo" className="h-8 w-8" />
          <span className="truncate text-sm font-semibold text-white">{companyName}</span>
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-slate-400 hover:bg-sidebar-hover lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-sidebar-hover hover:text-white',
                )
              }
            >
              <it.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{it.label}</span>
              {it.badge && badges[it.badge] > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badges[it.badge]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs capitalize text-slate-500">
          {role} workspace
        </div>
      </aside>
    </>
  )
}

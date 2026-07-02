import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, NAV } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '@/context/AuthContext'
import { configApi } from '@/api/endpoints'

function titleFor(role, pathname) {
  const items = NAV[role] || []
  // exact match first, then best prefix match
  const exact = items.find((i) => i.to === pathname)
  if (exact) return exact.label
  const prefix = items
    .filter((i) => !i.end && pathname.startsWith(i.to))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return prefix?.label || 'Dashboard'
}

export function DashboardLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState('Employee Report')

  useEffect(() => {
    configApi.public().then((r) => setCompany(r.data.company_name)).catch(() => {})
  }, [])

  const title = titleFor(user.role, location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={user.role} companyName={company} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

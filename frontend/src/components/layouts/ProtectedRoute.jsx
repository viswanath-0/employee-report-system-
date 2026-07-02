import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/utils/format'
import { Spinner } from '@/components/ui/spinner'

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Spinner className="h-8 w-8 text-brand-500" />
    </div>
  )
}

/** Requires an authenticated user; optionally a specific role. */
export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />
  return children
}

/** For login/register: bounce authenticated users to their dashboard. */
export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to={roleHome(user.role)} replace />
  return children
}

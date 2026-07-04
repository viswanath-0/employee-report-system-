import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute, RequireAuth } from '@/components/layouts/ProtectedRoute'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/utils/format'

import Login from '@/pages/auth/Login'
import CreateAccount from '@/pages/auth/CreateAccount'
import RequestAccess from '@/pages/auth/RequestAccess'
import SetPassword from '@/pages/auth/SetPassword'

import EmployeeDashboard from '@/pages/employee/Dashboard'
import MyReports from '@/pages/employee/MyReports'
import SubmitReport from '@/pages/employee/SubmitReport'
import LeaveApplication from '@/pages/employee/LeaveApplication'
import EmployeeEscalations from '@/pages/employee/Escalations'
import EmployeeProfile from '@/pages/employee/Profile'

import ManagerDashboard from '@/pages/manager/Dashboard'
import TeamReports from '@/pages/manager/TeamReports'
import PendingApprovals from '@/pages/manager/PendingApprovals'
import LeaveRequests from '@/pages/manager/LeaveRequests'
import ManagerEscalations from '@/pages/manager/Escalations'
import ManagerProfile from '@/pages/manager/Profile'

import AdminDashboard from '@/pages/admin/Dashboard'
import AllEmployees from '@/pages/admin/Employees'
import AllManagers from '@/pages/admin/Managers'
import AllReports from '@/pages/admin/Reports'
import Departments from '@/pages/admin/Departments'
import AdminSettings from '@/pages/admin/Settings'

function RootRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/create-account" element={<PublicRoute><CreateAccount /></PublicRoute>} />
      <Route path="/request-access" element={<PublicRoute><RequestAccess /></PublicRoute>} />
      <Route path="/set-password" element={<RequireAuth><SetPassword /></RequireAuth>} />

      {/* Employee */}
      <Route
        path="/employee"
        element={<ProtectedRoute role="employee"><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="reports" element={<MyReports />} />
        <Route path="submit" element={<SubmitReport />} />
        <Route path="leave" element={<LeaveApplication />} />
        <Route path="escalations" element={<EmployeeEscalations />} />
        <Route path="profile" element={<EmployeeProfile />} />
      </Route>

      {/* Manager */}
      <Route
        path="/manager"
        element={<ProtectedRoute role="manager"><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<ManagerDashboard />} />
        <Route path="team" element={<TeamReports />} />
        <Route path="approvals" element={<PendingApprovals />} />
        <Route path="leaves" element={<LeaveRequests />} />
        <Route path="escalations" element={<ManagerEscalations />} />
        <Route path="profile" element={<ManagerProfile />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<AllEmployees />} />
        <Route path="managers" element={<AllManagers />} />
        <Route path="reports" element={<AllReports />} />
        <Route path="departments" element={<Departments />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

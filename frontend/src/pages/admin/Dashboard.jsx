import { useEffect, useState } from 'react'
import {
  Users, UserCog, FileText, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { PageHeader } from '@/components/layouts/PageHeader'
import { MetricCard } from '@/components/MetricCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { adminApi } from '@/api/endpoints'
import { ddmmyyyy } from '@/utils/date'
import { statusMeta } from '@/utils/format'

// Map a report status to a solid hex for chart slices (statusMeta is class-based).
const STATUS_HEX = {
  approved: '#10b981',
  pending: '#f59e0b',
  unapproved: '#f43f5e',
  escalated: '#3b82f6',
  leave: '#94a3b8',
}
const statusColor = (status) => STATUS_HEX[status] || '#6366F1'

// 'YYYY-MM-DD' -> 'DD-MM' for compact axis ticks.
const shortDate = (iso) => {
  if (!iso) return ''
  const [, m, d] = String(iso).split('-')
  return d && m ? `${d}-${m}` : iso
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.stats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = stats?.cards || {}
  const reportsPerDay = stats?.reports_per_day || []
  const statusDist = stats?.status_distribution || []
  const deptDist = stats?.department_distribution || []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Dashboard"
        description="Company-wide activity across every team and report."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total employees" value={cards.total_employees ?? 0} icon={Users} tone="brand" loading={loading} />
        <MetricCard label="Total managers" value={cards.total_managers ?? 0} icon={UserCog} tone="violet" loading={loading} />
        <MetricCard label="Reports today" value={cards.reports_today ?? 0} icon={FileText} tone="blue" loading={loading} />
        <MetricCard label="Pending company-wide" value={cards.pending_company_wide ?? 0} icon={Clock} tone="amber" loading={loading} />
        <MetricCard label="Approved today" value={cards.approved_today ?? 0} icon={CheckCircle2} tone="emerald" loading={loading} />
        <MetricCard label="Unapproved this month" value={cards.unapproved_this_month ?? 0} icon={AlertTriangle} tone="rose" loading={loading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Reports per day</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : reportsPerDay.length === 0 ? (
              <EmptyState icon={FileText} title="No report activity yet" description="Daily report volume will appear here once employees start submitting." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={reportsPerDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    labelFormatter={(v) => ddmmyyyy(v)}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Reports" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status distribution</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : statusDist.length === 0 ? (
              <EmptyState icon={FileText} title="No reports yet" description="Report statuses will be broken down here." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusDist.map((entry) => (
                      <Cell key={entry.status} fill={statusColor(entry.status)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, statusMeta(name).label]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value) => statusMeta(value).label}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Reports by department</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : deptDist.length === 0 ? (
              <EmptyState icon={Users} title="No department data" description="Report counts per department will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptDist} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Reports" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

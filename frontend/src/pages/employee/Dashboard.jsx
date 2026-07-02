import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle2, Clock, XCircle, Bell } from 'lucide-react'
import { MetricCard } from '@/components/MetricCard'
import { CalendarMonth } from '@/components/CalendarMonth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { reportsApi } from '@/api/endpoints'
import { useNotifications } from '@/context/NotificationContext'
import { todayISO, relativeTime } from '@/utils/date'

export default function Dashboard() {
  const navigate = useNavigate()
  const { items } = useNotifications()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })

  useEffect(() => {
    reportsApi.my().then((r) => setReports(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const monthPrefix = todayISO().slice(0, 7)
  const inMonth = reports.filter((r) => r.date.startsWith(monthPrefix))
  const metrics = {
    total: reports.length,
    approved: inMonth.filter((r) => r.status === 'approved').length,
    pending: inMonth.filter((r) => r.status === 'pending').length,
    unapproved: reports.filter((r) => r.status === 'unapproved').length,
  }
  const markers = Object.fromEntries(reports.map((r) => [r.date, r.status]))

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total reports" value={metrics.total} icon={FileText} tone="brand" loading={loading} />
        <MetricCard label="Approved this month" value={metrics.approved} icon={CheckCircle2} tone="emerald" loading={loading} />
        <MetricCard label="Pending this month" value={metrics.pending} icon={Clock} tone="amber" loading={loading} />
        <MetricCard label="Unapproved" value={metrics.unapproved} icon={XCircle} tone="rose" loading={loading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Your month at a glance</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <CalendarMonth
                year={cursor.y}
                month={cursor.m}
                markers={markers}
                onPrev={() => setCursor((c) => { const d = new Date(c.y, c.m - 1); return { y: d.getFullYear(), m: d.getMonth() } })}
                onNext={() => setCursor((c) => { const d = new Date(c.y, c.m + 1); return { y: d.getFullYear(), m: d.getMonth() } })}
                onSelect={(iso, status) => { if (status) navigate('/employee/reports') }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState icon={Bell} title="No activity yet" description="Status changes and manager messages will show up here." />
            ) : (
              <ul className="space-y-3">
                {items.slice(0, 7).map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.message && <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                      <p className="text-[11px] text-slate-400">{relativeTime(n.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

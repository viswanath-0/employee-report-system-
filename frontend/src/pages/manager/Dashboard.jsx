import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ClipboardCheck, CheckCircle2, AlertTriangle } from 'lucide-react'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { managerApi } from '@/api/endpoints'
import { ddmmyyyy } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([managerApi.stats(), managerApi.team()])
      .then(([s, t]) => {
        setStats(s.data)
        setTeam(t.data)
      })
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description="An overview of your team and pending work." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total employees" value={stats?.team_size ?? 0} icon={Users} tone="brand" loading={loading} />
        <MetricCard label="Pending approvals" value={stats?.pending_approvals ?? 0} icon={ClipboardCheck} tone="amber" loading={loading} />
        <MetricCard label="Approved today" value={stats?.approved_today ?? 0} icon={CheckCircle2} tone="emerald" loading={loading} />
        <MetricCard label="Pending escalations" value={stats?.pending_escalations ?? 0} icon={AlertTriangle} tone="rose" loading={loading} />
      </div>

      <Card>
        <CardHeader><CardTitle>Team overview</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-2 px-5 pb-5">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : team.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={Users}
                title="No team members yet"
                description="Employees assigned to you will appear here."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Today&apos;s Status</TH>
                  <TH>Last Submission</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {team.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} size="sm" />
                        <span className="font-medium text-slate-900">{m.name}</span>
                      </div>
                    </TD>
                    <TD className="text-slate-500">{m.department}</TD>
                    <TD>
                      {m.today_status && m.today_status !== 'none' ? (
                        <StatusBadge status={m.today_status} />
                      ) : (
                        <span className="text-sm text-slate-400">No report</span>
                      )}
                    </TD>
                    <TD className="text-slate-500">
                      {m.last_submission ? ddmmyyyy(m.last_submission) : '—'}
                    </TD>
                    <TD className="text-right">
                      <Button size="sm" variant="subtle" onClick={() => navigate('/manager/team')}>
                        View
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

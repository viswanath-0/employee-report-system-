import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Users, FileText, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ReportDetail } from '@/components/ReportDetail'
import { ReportReviewDrawer } from '@/components/modals/ReportReviewDrawer'
import { MiniTimeline } from '@/components/timeline/MiniTimeline'
import { managerApi } from '@/api/endpoints'
import { ddmmyyyy, hhmmToLabel } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'
import { cn } from '@/utils/cn'

export default function TeamReports() {
  const [team, setTeam] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [reviewId, setReviewId] = useState(null)

  useEffect(() => {
    setTeamLoading(true)
    managerApi
      .team()
      .then((r) => {
        setTeam(r.data)
        if (r.data.length > 0) setSelected(r.data[0])
      })
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setTeamLoading(false))
  }, [])

  // Load a team member's report history. resetExpanded collapses open rows on
  // employee switch; on a post-action reload we keep the current row open.
  const loadReports = (emp, resetExpanded = false) => {
    if (!emp) return
    setReportsLoading(true)
    if (resetExpanded) setExpanded(null)
    managerApi
      .employeeReports(emp.id)
      .then((r) => setReports(r.data))
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setReportsLoading(false))
  }

  useEffect(() => {
    loadReports(selected, true)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader title="Team Reports" description="Browse each team member's report history." />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Employee list */}
        <Card className="lg:col-span-1">
          <CardContent className="p-2">
            {teamLoading ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : team.length === 0 ? (
              <EmptyState icon={Users} title="No team members" description="Employees assigned to you will appear here." />
            ) : (
              <ul className="space-y-1">
                {team.map((m) => {
                  const active = selected?.id === m.id
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => setSelected(m)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50',
                        )}
                      >
                        <Avatar name={m.name} size="sm" />
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-medium', active ? 'text-brand-700' : 'text-slate-900')}>
                            {m.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">{m.department}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Report history */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            {!selected ? (
              <EmptyState icon={FileText} title="Select an employee" description="Pick a team member to see their report history." />
            ) : reportsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No reports yet"
                description={`${selected.name} hasn't submitted any reports.`}
              />
            ) : (
              <div className="space-y-2">
                <div className="mb-1 flex items-center gap-2">
                  <Avatar name={selected.name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selected.name}</p>
                    <p className="text-xs text-slate-500">{reports.length} report{reports.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                {reports.map((r) => {
                  const open = expanded === r.id
                  return (
                    <Fragment key={r.id}>
                      <button
                        onClick={() => setExpanded(open ? null : r.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      >
                        {open ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="font-medium text-slate-900">{ddmmyyyy(r.date)}</span>
                        <span className="text-xs text-slate-400">{r.leave ? 'Leave' : `${r.tasks_count} task${r.tasks_count === 1 ? '' : 's'}`}</span>
                        <span className="ml-auto flex items-center gap-3">
                          <span className="hidden text-xs text-slate-400 sm:inline">{hhmmToLabel(r.deadline)}</span>
                          <StatusBadge status={r.status} late={r.is_late} />
                        </span>
                      </button>
                      {open && (
                        <div className="rounded-lg bg-slate-50/60 px-4 py-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">
                              {r.leave ? 'Leave request' : 'Daily report'}
                            </span>
                            {r.locked ? (
                              <span className="text-xs font-medium text-slate-400">
                                Locked — ask an admin to re-open
                              </span>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => setReviewId(r.id)}>
                                <ClipboardCheck className="h-3.5 w-3.5" /> Review
                              </Button>
                            )}
                          </div>
                          {!r.leave && r.tasks?.length > 0 && (
                            <MiniTimeline tasks={r.tasks} className="mb-3" />
                          )}
                          <ReportDetail report={r} />
                        </div>
                      )}
                    </Fragment>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReportReviewDrawer
        reportId={reviewId}
        open={!!reviewId}
        onClose={() => setReviewId(null)}
        onActioned={() => loadReports(selected)}
      />
    </div>
  )
}

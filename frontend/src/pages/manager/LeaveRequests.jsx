import { useEffect, useState } from 'react'
import { CalendarOff, Download, Check, X } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LeaveStatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { managerApi } from '@/api/endpoints'
import { fileUrl } from '@/api/axios'
import { ddmmyyyy } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'

export default function LeaveRequests() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    setLoading(true)
    managerApi
      .leaves()
      .then((r) => setList(r.data))
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const act = async (id, kind) => {
    setBusyId(id)
    try {
      if (kind === 'approve') {
        await managerApi.approveLeave(id)
        notify.success('Leave approved')
      } else {
        await managerApi.rejectLeave(id)
        notify.success('Leave rejected')
      }
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Leave Requests" description="Approve or reject leave applications from your team." />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No leave requests"
          description="Leave applications from your team will appear here."
        />
      ) : (
        <div className="space-y-3">
          {list.map((lv) => (
            <Card key={lv.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={lv.employee_name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{lv.employee_name}</p>
                        <p className="truncate text-xs text-slate-500">{lv.department} · {ddmmyyyy(lv.date)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {lv.leave_type} leave
                      </span>
                      <LeaveStatusBadge status={lv.status} />
                    </div>

                    {lv.reason && <p className="mt-2 text-sm text-slate-600">{lv.reason}</p>}

                    {lv.file_path && (
                      <a
                        href={fileUrl(lv.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                      >
                        <Download className="h-4 w-4" /> {lv.file_name || 'Supporting document'}
                      </a>
                    )}
                  </div>

                  {lv.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        loading={busyId === lv.id}
                        onClick={() => act(lv.id, 'approve')}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busyId === lv.id}
                        onClick={() => act(lv.id, 'reject')}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

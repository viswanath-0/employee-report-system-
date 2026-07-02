import { useEffect, useState } from 'react'
import { ClipboardCheck, Eye, CalendarOff } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { MiniTimeline } from '@/components/timeline/MiniTimeline'
import { ReportReviewDrawer } from '@/components/modals/ReportReviewDrawer'
import { managerApi } from '@/api/endpoints'
import { ddmmyyyy } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'

export default function PendingApprovals() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewId, setReviewId] = useState(null)

  const load = () => {
    setLoading(true)
    managerApi
      .pending()
      .then((r) => setList(r.data))
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div>
      <PageHeader title="Pending Approvals" description="Review and act on reports awaiting your approval." />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="All caught up!"
          description="There are no reports pending your approval right now."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col pt-5">
                <div className="flex items-center gap-3">
                  <Avatar name={r.employee?.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{r.employee?.name}</p>
                    <p className="truncate text-xs text-slate-500">{r.employee?.department}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{ddmmyyyy(r.date)}</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    {r.leave ? (
                      <>
                        <CalendarOff className="h-4 w-4 text-slate-400" /> Leave
                      </>
                    ) : (
                      `${r.tasks_count} task${r.tasks_count === 1 ? '' : 's'}`
                    )}
                  </span>
                </div>

                <div className="mt-3">
                  <MiniTimeline tasks={r.tasks} leave={!!r.leave} />
                </div>

                <div className="mt-4 flex-1" />

                <Button className="mt-2 w-full" onClick={() => setReviewId(r.id)}>
                  <Eye className="h-4 w-4" /> Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReportReviewDrawer
        reportId={reviewId}
        open={reviewId != null}
        onClose={() => setReviewId(null)}
        onActioned={load}
      />
    </div>
  )
}

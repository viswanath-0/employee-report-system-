import { useEffect, useState } from 'react'
import { Inbox, Eye, Check } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ReportReviewDrawer } from '@/components/modals/ReportReviewDrawer'
import { managerApi } from '@/api/endpoints'
import { ddmmyyyy, prettyDateTime } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'
import { cn } from '@/utils/cn'

export default function Escalations() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [reviewId, setReviewId] = useState(null)

  const load = () => {
    setLoading(true)
    managerApi
      .escalations()
      .then((r) => setList(r.data))
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const resolve = async (id) => {
    setBusyId(id)
    try {
      await managerApi.resolveEscalation(id)
      notify.success('Escalation resolved')
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Escalations Inbox" description="Reports your team members have escalated to you." />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Inbox zero"
          description="No escalations from your team right now."
        />
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={e.employee_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-slate-900">{e.employee_name}</p>
                          <Badge className={cn(
                            e.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700',
                          )}>
                            {e.status === 'resolved' ? 'Resolved' : 'Sent'}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-slate-500">Report — {ddmmyyyy(e.report_date)}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{e.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{prettyDateTime(e.sent_at)}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setReviewId(e.report_id)}>
                      <Eye className="h-3.5 w-3.5" /> View report
                    </Button>
                    {e.status === 'sent' && (
                      <Button
                        size="sm"
                        variant="success"
                        loading={busyId === e.id}
                        onClick={() => resolve(e.id)}
                      >
                        <Check className="h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
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

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { escalationApi } from '@/api/endpoints'
import { ddmmyyyy, prettyDateTime } from '@/utils/date'
import { cn } from '@/utils/cn'

export default function Escalations() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    escalationApi.my().then((r) => setList(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Escalations" description="Reports you have escalated to your manager." />
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No escalations"
          description="You haven't escalated any reports. You can escalate a pending report from My Reports when it's eligible."
        />
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">Report — {ddmmyyyy(e.report_date)}</p>
                    <Badge className={cn(
                      e.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700',
                    )}>
                      {e.status === 'resolved' ? 'Resolved' : 'Sent'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{e.message}</p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">{prettyDateTime(e.sent_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

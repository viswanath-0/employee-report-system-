import { useEffect, useMemo, useState } from 'react'
import { CalendarOff, Plus, Download } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { CalendarMonth } from '@/components/CalendarMonth'
import { FileUpload } from '@/components/FileUpload'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { LeaveStatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { reportsApi, leaveApi } from '@/api/endpoints'
import { fileUrl } from '@/api/axios'
import { todayISO, ddmmyyyy } from '@/utils/date'
import { LEAVE_TYPES } from '@/utils/format'
import { notify, apiError } from '@/utils/toast'

const statusToMarker = { approved: 'approved', pending: 'pending', rejected: 'unapproved' }

export default function LeaveApplication() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ date: todayISO(), leave_type: 'Casual', reason: '', files: [] })

  const load = () => {
    setLoading(true)
    reportsApi.my().then((r) => setReports(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const leaves = useMemo(
    () => reports.filter((r) => r.leave).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [reports],
  )
  const markers = Object.fromEntries(
    leaves.map((r) => [r.date, statusToMarker[r.leave.status] || 'leave']),
  )

  const apply = async () => {
    if (!form.reason.trim()) return notify.error('Please provide a reason')
    if (form.files.length === 0) return notify.error('A supporting document is required')
    setBusy(true)
    try {
      await leaveApi.apply({
        date: form.date,
        leave_type: form.leave_type,
        reason: form.reason.trim(),
        file_path: form.files[0].file_path,
        file_name: form.files[0].file_name,
      })
      notify.success('Leave application submitted')
      setOpen(false)
      setForm({ date: todayISO(), leave_type: 'Casual', reason: '', files: [] })
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Leave Application"
        description="Apply for leave and track the status of your requests."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Apply for Leave</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Leave calendar</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <CalendarMonth
                year={cursor.y}
                month={cursor.m}
                markers={markers}
                legend={false}
                onPrev={() => setCursor((c) => { const d = new Date(c.y, c.m - 1); return { y: d.getFullYear(), m: d.getMonth() } })}
                onNext={() => setCursor((c) => { const d = new Date(c.y, c.m + 1); return { y: d.getFullYear(), m: d.getMonth() } })}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your leave requests</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : leaves.length === 0 ? (
              <EmptyState icon={CalendarOff} title="No leave requests" description="Your leave applications will appear here." />
            ) : (
              <div className="space-y-2">
                {leaves.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{ddmmyyyy(r.date)}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{r.leave.leave_type}</span>
                      </div>
                      <LeaveStatusBadge status={r.leave.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{r.leave.reason}</p>
                    {r.leave.file_path && (
                      <a
                        href={fileUrl(r.leave.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> {r.leave.file_name || 'Document'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Apply for Leave"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={apply}>Submit application</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Leave type</Label>
              <Select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave…" />
          </div>
          <div>
            <Label>Supporting document (required)</Label>
            <FileUpload value={form.files} onChange={(files) => setForm({ ...form, files })} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

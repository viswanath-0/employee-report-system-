import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown, ChevronRight, FileText, AlertCircle, Send, ArrowUpCircle, RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ReportDetail } from '@/components/ReportDetail'
import { FileUpload } from '@/components/FileUpload'
import { MiniTimeline } from '@/components/timeline/MiniTimeline'
import { reportsApi, escalationApi } from '@/api/endpoints'
import { ddmmyyyy, hhmmToLabel, canEscalate } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'

export default function MyReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filters, setFilters] = useState({ from: '', to: '', status: 'all' })

  const [escalateFor, setEscalateFor] = useState(null)
  const [escalateMsg, setEscalateMsg] = useState('')
  const [resubmitFor, setResubmitFor] = useState(null)
  const [resubmitNote, setResubmitNote] = useState('')
  const [resubmitProof, setResubmitProof] = useState([])
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    reportsApi.my().then((r) => setReports(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filters.status !== 'all' && r.status !== filters.status) return false
      if (filters.from && r.date < filters.from) return false
      if (filters.to && r.date > filters.to) return false
      return true
    })
  }, [reports, filters])

  const submitEscalation = async () => {
    if (!escalateMsg.trim()) return notify.error('Please add a message for your manager')
    setBusy(true)
    try {
      await escalationApi.create({ report_id: escalateFor.id, message: escalateMsg.trim() })
      notify.success('Escalation sent to your manager')
      setReports((prev) => prev.map((r) => (r.id === escalateFor.id ? { ...r, status: 'escalated' } : r)))
      setEscalateFor(null)
      setEscalateMsg('')
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const submitResubmit = async () => {
    const r = resubmitFor
    setBusy(true)
    try {
      const payload = {
        is_leave: !!r.leave,
        note: resubmitNote.trim() || null,
        explanation: resubmitNote.trim() || null,
        proof_files: resubmitProof,
        tasks: (r.tasks || []).map((t) => ({
          title: t.title, description: t.description || '',
          start_time: t.start_time, end_time: t.end_time, color: t.color,
          files: (t.files || []).map((f) => ({
            file_name: f.file_name, file_path: f.file_path, file_size: f.file_size || 0,
          })),
        })),
        leave: r.leave
          ? { leave_type: r.leave.leave_type, reason: r.leave.reason, file_path: r.leave.file_path, file_name: r.leave.file_name }
          : null,
      }
      await reportsApi.resubmit(r.id, payload)
      notify.success('Report resubmitted for review')
      setResubmitFor(null)
      setResubmitNote('')
      setResubmitProof([])
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="My Reports" description="Every daily report you've submitted." />

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="unapproved">Unapproved</option>
              <option value="escalated">Escalated</option>
              <option value="leave">Leave</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports found"
            description="Try adjusting your filters, or submit today's report."
            action={<Button onClick={() => (window.location.href = '/employee/submit')}><Send className="h-4 w-4" /> Submit Report</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-8"></TH>
                <TH>Date</TH>
                <TH>Tasks</TH>
                <TH>Status</TH>
                <TH>Deadline</TH>
                <TH>Manager feedback</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r) => {
                const open = expanded === r.id
                const escalatable = canEscalate(r.status, r.created_at)
                return (
                  <Fragment key={r.id}>
                    <TR className="cursor-pointer" onClick={() => setExpanded(open ? null : r.id)}>
                      <TD>{open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}</TD>
                      <TD className="font-medium text-slate-900">{ddmmyyyy(r.date)}</TD>
                      <TD>{r.leave ? '—' : r.tasks_count}</TD>
                      <TD><StatusBadge status={r.status} late={r.is_late} /></TD>
                      <TD className="text-slate-500">{hhmmToLabel(r.deadline)}</TD>
                      <TD className="max-w-[200px] truncate text-slate-500">
                        {r.correction_message || '—'}
                      </TD>
                      <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {r.status === 'unapproved' && (
                            <Button size="sm" variant="warning" onClick={() => setResubmitFor(r)}>
                              <RefreshCw className="h-3.5 w-3.5" /> Resubmit
                            </Button>
                          )}
                          {escalatable && (
                            <Button size="sm" variant="subtle" onClick={() => setEscalateFor(r)}>
                              <ArrowUpCircle className="h-3.5 w-3.5" /> Escalate
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                    {open && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={7} className="px-6 py-4">
                          {r.status === 'unapproved' && r.correction_message && (
                            <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="font-medium">Manager requested clarification:</p>
                                <p>{r.correction_message}</p>
                                <Button size="sm" variant="warning" className="mt-2" onClick={() => setResubmitFor(r)}>
                                  Resubmit with Explanation
                                </Button>
                              </div>
                            </div>
                          )}
                          {r.status === 'pending' && escalatable && (
                            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p>This report is still pending. You can escalate it to your manager.</p>
                                <Button size="sm" variant="subtle" className="mt-2" onClick={() => setEscalateFor(r)}>
                                  Escalate to Manager
                                </Button>
                              </div>
                            </div>
                          )}
                          {!r.leave && r.tasks?.length > 0 && (
                            <MiniTimeline tasks={r.tasks} className="mb-3" />
                          )}
                          <ReportDetail report={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Escalate modal */}
      <Dialog
        open={!!escalateFor}
        onClose={() => setEscalateFor(null)}
        title="Escalate Pending Report"
        description={escalateFor ? `Report dated ${ddmmyyyy(escalateFor.date)}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEscalateFor(null)}>Cancel</Button>
            <Button loading={busy} onClick={submitEscalation}>Send escalation</Button>
          </>
        }
      >
        <Label>Add a message for your manager</Label>
        <Textarea
          value={escalateMsg}
          onChange={(e) => setEscalateMsg(e.target.value)}
          placeholder="Explain why you're escalating this report…"
        />
      </Dialog>

      {/* Resubmit modal */}
      <Dialog
        open={!!resubmitFor}
        onClose={() => setResubmitFor(null)}
        title="Resubmit Report"
        description={resubmitFor ? `Report dated ${ddmmyyyy(resubmitFor.date)}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResubmitFor(null)}>Cancel</Button>
            <Button variant="warning" loading={busy} onClick={submitResubmit}>Resubmit for review</Button>
          </>
        }
      >
        {resubmitFor?.correction_message && (
          <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            <span className="font-medium">Manager's note:</span> {resubmitFor.correction_message}
          </div>
        )}
        <Label>Explanation (optional)</Label>
        <Textarea
          value={resubmitNote}
          onChange={(e) => setResubmitNote(e.target.value)}
          placeholder="Describe what you changed or clarified…"
        />
        <div className="mt-3">
          <Label>Proof / supporting files (optional)</Label>
          <FileUpload value={resubmitProof} onChange={setResubmitProof} />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Your existing tasks will be resubmitted and the report set back to pending. To change task
          details, edit today&apos;s report from the Submit page.
        </p>
      </Dialog>
    </div>
  )
}

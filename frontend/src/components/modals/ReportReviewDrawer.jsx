import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, CheckCircle2, MessageSquare, XCircle, AlertCircle,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ReportDetail } from '@/components/ReportDetail'
import { managerApi } from '@/api/endpoints'
import { ddmmyyyy, hhmmToLabel } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'

/**
 * Right-side slide-in drawer for reviewing a single report.
 * Standalone (does not use the Dialog component). Props: { reportId, open, onClose, onActioned }.
 */
export function ReportReviewDrawer({ reportId, open, onClose, onActioned }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  // 'idle' | 'clarify' | 'confirm-unapprove'
  const [mode, setMode] = useState('idle')
  const [message, setMessage] = useState('')

  // Fetch the report whenever the drawer opens with an id.
  useEffect(() => {
    if (!open || !reportId) return
    setReport(null)
    setMode('idle')
    setMessage('')
    setLoading(true)
    managerApi
      .report(reportId)
      .then((r) => setReport(r.data))
      .catch((err) => notify.error(apiError(err)))
      .finally(() => setLoading(false))
  }, [open, reportId])

  // ESC to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const done = () => {
    onActioned?.()
    onClose?.()
  }

  const doApprove = async () => {
    setBusy(true)
    try {
      await managerApi.approve(report.id)
      notify.success('Report approved successfully')
      done()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const doClarify = async () => {
    if (!message.trim()) return notify.error('Please describe what correction is needed')
    setBusy(true)
    try {
      await managerApi.unapprove(report.id, message.trim())
      notify.success('Clarification request sent')
      done()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const doUnapprove = async () => {
    setBusy(true)
    try {
      await managerApi.unapprove(report.id, null)
      notify.success('Report marked as unapproved')
      done()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const emp = report?.employee

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            {loading || !report ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar name={emp?.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{emp?.name}</p>
                  <p className="truncate text-sm text-slate-500">{emp?.email}</p>
                  {emp?.department && (
                    <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {emp.department}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading || !report ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Report date</p>
                  <p className="text-sm font-medium text-slate-900">{ddmmyyyy(report.date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Deadline</p>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    {hhmmToLabel(report.deadline)}
                    {report.is_late && (
                      <span className="rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-600">
                        LATE
                      </span>
                    )}
                  </p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={report.status} late={report.is_late} />
                </div>
              </div>

              {report.correction_message && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Previous clarification request:</p>
                    <p>{report.correction_message}</p>
                  </div>
                </div>
              )}

              <ReportDetail report={report} />
            </>
          )}
        </div>

        {/* Action bar */}
        {report && !loading && (
          <div className="border-t border-slate-100 px-6 py-4">
            {mode === 'clarify' ? (
              <div className="space-y-3">
                <div>
                  <Label>Describe what correction is needed</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain what the employee should fix or clarify…"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={() => setMode('idle')} disabled={busy}>
                    Cancel
                  </Button>
                  <Button variant="warning" loading={busy} onClick={doClarify}>
                    Send clarification
                  </Button>
                </div>
              </div>
            ) : mode === 'confirm-unapprove' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Are you sure? This will permanently mark it unapproved with no correction
                    message.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={() => setMode('idle')} disabled={busy}>
                    Cancel
                  </Button>
                  <Button variant="danger" loading={busy} onClick={doUnapprove}>
                    Yes, mark unapproved
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="warning" onClick={() => setMode('clarify')}>
                  <MessageSquare className="h-4 w-4" /> Request Clarification
                </Button>
                <Button variant="danger" onClick={() => setMode('confirm-unapprove')}>
                  <XCircle className="h-4 w-4" /> Unapprove
                </Button>
                <Button variant="success" loading={busy} onClick={doApprove}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default ReportReviewDrawer

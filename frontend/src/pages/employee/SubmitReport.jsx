import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Clock, AlertCircle, Trash2, Send, Pencil, Paperclip, CheckCircle2,
} from 'lucide-react'
import { Timeline } from '@/components/timeline/Timeline'
import { TaskFormPanel } from '@/components/timeline/TaskFormPanel'
import { FileUpload } from '@/components/FileUpload'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { configApi, reportsApi } from '@/api/endpoints'
import { useCountdown } from '@/hooks/useCountdown'
import {
  todayISO, prettyDate, minutesToHHMM, hhmmToMinutes, hhmmToLabel,
} from '@/utils/date'
import { nextColor, taskColor, LEAVE_TYPES } from '@/utils/format'
import { notify, apiError } from '@/utils/toast'
import { cn } from '@/utils/cn'

const uid = () => (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))

export default function SubmitReport() {
  const navigate = useNavigate()
  const today = todayISO()

  const [cfg, setCfg] = useState({ work_day_start: '09:00', work_day_end: '21:00', deadline_time: '20:00' })
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [draft, setDraft] = useState(null)
  const [isLeave, setIsLeave] = useState(false)
  const [leave, setLeave] = useState({ leave_type: 'Casual', reason: '', files: [] })
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approved, setApproved] = useState(false)

  const startMin = hhmmToMinutes(cfg.work_day_start)
  const endMin = hhmmToMinutes(cfg.work_day_end)
  const countdown = useCountdown(cfg.deadline_time)

  useEffect(() => {
    let alive = true
    Promise.all([configApi.public(), reportsApi.byDate(today).catch(() => null)])
      .then(([c, r]) => {
        if (!alive) return
        if (c?.data) setCfg(c.data)
        const report = r?.data
        if (report) {
          if (report.status === 'approved') setApproved(true)
          if (report.status === 'leave' && report.leave) {
            setIsLeave(true)
            setLeave({
              leave_type: report.leave.leave_type,
              reason: report.leave.reason,
              files: report.leave.file_path
                ? [{ file_name: report.leave.file_name, file_path: report.leave.file_path, file_size: 0 }]
                : [],
            })
          } else {
            setTasks(
              (report.tasks || []).map((t) => ({
                id: uid(),
                title: t.title,
                description: t.description,
                color: t.color,
                start_time: t.start_time,
                end_time: t.end_time,
                files: t.files || [],
              })),
            )
          }
        }
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [today])

  // ---- timeline interactions ----
  const handleCreate = ({ startMin: s, endMin: e }) => {
    setDraft({ startMin: s, endMin: e, color: nextColor(tasks.length), files: [] })
  }
  const handleEdit = (task) => {
    setDraft({
      ...task,
      startMin: hhmmToMinutes(task.start_time),
      endMin: hhmmToMinutes(task.end_time),
    })
  }
  const handleSave = (d) => {
    const saved = {
      id: d.id || uid(),
      title: d.title,
      description: d.description,
      color: d.color,
      files: d.files,
      start_time: minutesToHHMM(d.startMin),
      end_time: minutesToHHMM(d.endMin),
    }
    setTasks((prev) => (d.id ? prev.map((t) => (t.id === d.id ? saved : t)) : [...prev, saved]))
    setDraft(null)
  }
  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    if (draft?.id === id) setDraft(null)
  }

  // ---- leave toggle ----
  const onToggleLeave = (next) => {
    if (next && tasks.length > 0) {
      setConfirmLeave(true)
      return
    }
    setIsLeave(next)
    setDraft(null)
  }
  const confirmSwitchToLeave = () => {
    setTasks([])
    setDraft(null)
    setIsLeave(true)
    setConfirmLeave(false)
  }

  // ---- submit ----
  const submit = async () => {
    if (isLeave) {
      if (!leave.reason.trim()) return notify.error('Please provide a reason for your leave')
      if (leave.files.length === 0) return notify.error('A supporting document is required for leave')
    } else if (tasks.length === 0) {
      return notify.error('Add at least one task, or apply for leave')
    }

    const payload = {
      date: today,
      is_leave: isLeave,
      tasks: isLeave
        ? []
        : tasks.map((t) => ({
            title: t.title,
            description: t.description || '',
            start_time: t.start_time,
            end_time: t.end_time,
            color: t.color,
            files: (t.files || []).map((f) => ({
              file_name: f.file_name, file_path: f.file_path, file_size: f.file_size || 0,
            })),
          })),
      leave: isLeave
        ? {
            leave_type: leave.leave_type,
            reason: leave.reason.trim(),
            file_path: leave.files[0]?.file_path,
            file_name: leave.files[0]?.file_name,
          }
        : null,
    }

    setSubmitting(true)
    try {
      await reportsApi.submit(payload)
      notify.success('Daily report submitted!')
      navigate('/employee/reports')
    } catch (err) {
      notify.error(apiError(err, 'Failed to submit report'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <CalendarDays className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-semibold">Submit Daily Report</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{prettyDate(today)}</p>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            countdown.passed ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700',
          )}
        >
          <Clock className="h-4 w-4" />
          Deadline: {hhmmToLabel(cfg.deadline_time)} —{' '}
          {countdown.passed ? `passed ${countdown.label} ago` : `${countdown.label} remaining`}
        </div>
      </div>

      {approved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Today&apos;s report has already been approved. Re-submitting is disabled.
        </div>
      )}

      {countdown.passed && !approved && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          Deadline passed. You can still submit, but it will be marked <b>late</b>.
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardContent className="pt-5">
          <Timeline
            startMin={startMin}
            endMin={endMin}
            tasks={isLeave ? [] : tasks}
            leaveMode={isLeave}
            onCreate={handleCreate}
            onEditTask={handleEdit}
          />

          {!isLeave && draft && (
            <div className="mt-4">
              <TaskFormPanel
                draft={draft}
                onSave={handleSave}
                onCancel={() => setDraft(null)}
                onDelete={draft.id ? () => removeTask(draft.id) : undefined}
              />
            </div>
          )}

          {/* Leave toggle */}
          <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Apply for Leave Today</p>
              <p className="text-xs text-slate-500">Marks the whole day as leave and clears any tasks.</p>
            </div>
            <Switch checked={isLeave} onCheckedChange={onToggleLeave} disabled={approved} />
          </div>
        </CardContent>
      </Card>

      {/* Leave form */}
      {isLeave && (
        <Card className="animate-fade-up">
          <CardContent className="space-y-4 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Leave details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Leave type</Label>
                <Select
                  value={leave.leave_type}
                  onChange={(e) => setLeave({ ...leave, leave_type: e.target.value })}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={leave.reason}
                onChange={(e) => setLeave({ ...leave, reason: e.target.value })}
                placeholder="Briefly explain the reason for your leave…"
              />
            </div>
            <div>
              <Label>Supporting document (required)</Label>
              <FileUpload value={leave.files} onChange={(files) => setLeave({ ...leave, files })} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task list */}
      {!isLeave && tasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Tasks ({tasks.length})</p>
          {tasks.map((t) => {
            const c = taskColor(t.color)
            return (
              <div
                key={t.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', c.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{t.title}</p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {hhmmToLabel(t.start_time)} – {hhmmToLabel(t.end_time)}
                    </span>
                  </div>
                  {t.description && (
                    <div
                      className="rich-content mt-1 line-clamp-2 text-sm text-slate-500"
                      dangerouslySetInnerHTML={{ __html: t.description }}
                    />
                  )}
                  {t.files?.length > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Paperclip className="h-3 w-3" /> {t.files.length} attachment{t.files.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeTask(t.id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-sm text-slate-500">
            {isLeave ? 'Leave application ready' : `${tasks.length} task${tasks.length === 1 ? '' : 's'} added`}
          </p>
          <Button size="lg" loading={submitting} onClick={submit} disabled={approved}>
            <Send className="h-4 w-4" /> Submit Daily Report
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={confirmSwitchToLeave}
        title="Switch to leave?"
        description="Applying for leave will remove all tasks you've added for today. Continue?"
        confirmText="Yes, apply for leave"
        variant="warning"
      />
    </div>
  )
}

import { Download, FileText, MessageSquare } from 'lucide-react'
import { fileUrl } from '@/api/axios'
import { hhmmToLabel } from '@/utils/date'
import { taskColor, fileSize } from '@/utils/format'
import { cn } from '@/utils/cn'

/** The employee's clarification explanation + proof attachments (shown when present). */
function ClarificationBlock({ report }) {
  const text = report.clarification_response
  const proof = report.proof_files || []
  if (!text && proof.length === 0) return null
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
        <MessageSquare className="h-3.5 w-3.5" /> Employee's explanation
      </p>
      {text && <p className="mt-1 text-sm text-slate-700">{text}</p>}
      {proof.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {proof.map((f, i) => (
            <a
              key={i}
              href={fileUrl(f.file_path)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
            >
              <FileText className="h-3.5 w-3.5" /> {f.file_name}
              <span className="text-slate-400">{fileSize(f.file_size)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/** Renders a report's tasks (with attachments) or its leave details, plus any clarification. */
export function ReportDetail({ report }) {
  if (report.leave) {
    const lv = report.leave
    return (
      <div className="space-y-3">
        <ClarificationBlock report={report} />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {lv.leave_type} leave
          </span>
          <p className="mt-2 text-sm text-slate-700">{lv.reason}</p>
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
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ClarificationBlock report={report} />
      {!report.tasks?.length ? (
        <p className="text-sm text-slate-400">No tasks recorded.</p>
      ) : (
        report.tasks.map((t) => {
          const c = taskColor(t.color)
          return (
            <div key={t.id ?? t.start_time} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('h-3 w-3 rounded-full', c.dot)} />
                <p className="font-medium text-slate-900">{t.title}</p>
                <span className="text-xs text-slate-400">
                  {hhmmToLabel(t.start_time)} – {hhmmToLabel(t.end_time)}
                </span>
              </div>
              {t.description && (
                <div
                  className="rich-content mt-1.5 text-sm text-slate-600"
                  dangerouslySetInnerHTML={{ __html: t.description }}
                />
              )}
              {t.files?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.files.map((f) => (
                    <a
                      key={f.id ?? f.file_path}
                      href={fileUrl(f.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      <FileText className="h-3.5 w-3.5" /> {f.file_name}
                      <span className="text-slate-400">{fileSize(f.file_size)}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

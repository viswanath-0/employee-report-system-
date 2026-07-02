import { cn } from '@/utils/cn'
import { statusMeta, LEAVE_STATUS_META } from '@/utils/format'

export function Badge({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, withDot = true, late = false, className }) {
  const m = statusMeta(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        m.pill,
        className,
      )}
    >
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />}
      {m.label}
      {late && (
        <span className="ml-1 rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-600">
          LATE
        </span>
      )}
    </span>
  )
}

export function LeaveStatusBadge({ status, className }) {
  const m = LEAVE_STATUS_META[status] || LEAVE_STATUS_META.pending
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        m.pill,
        className,
      )}
    >
      {m.label}
    </span>
  )
}

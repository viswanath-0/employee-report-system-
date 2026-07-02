export function initials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((w) => w[0]?.toUpperCase() || '').join('') || '?'
}

export function fileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function roleHome(role) {
  if (role === 'admin') return '/admin'
  if (role === 'manager') return '/manager'
  return '/employee'
}

// Status badge styling (green/red/yellow/blue/gray per spec)
export const STATUS_META = {
  approved: { label: 'Approved', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20', dot: 'bg-emerald-500' },
  unapproved: { label: 'Unapproved', pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20', dot: 'bg-rose-500' },
  pending: { label: 'Pending', pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20', dot: 'bg-amber-500' },
  escalated: { label: 'Escalated', pill: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20', dot: 'bg-blue-500' },
  leave: { label: 'Leave', pill: 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20', dot: 'bg-slate-400' },
  none: { label: 'No report', pill: 'bg-slate-50 text-slate-400 ring-1 ring-slate-300/40', dot: 'bg-slate-300' },
}

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.none
}

// Leave request status
export const LEAVE_STATUS_META = {
  pending: { label: 'Pending', pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' },
  approved: { label: 'Approved', pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
  rejected: { label: 'Rejected', pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' },
}

// Timeline task colors — full literal class strings so Tailwind keeps them.
export const TASK_COLORS = {
  indigo: { block: 'bg-indigo-500 border-indigo-600', soft: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  teal: { block: 'bg-teal-500 border-teal-600', soft: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  amber: { block: 'bg-amber-500 border-amber-600', soft: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  rose: { block: 'bg-rose-500 border-rose-600', soft: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  violet: { block: 'bg-violet-500 border-violet-600', soft: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
}

export const TASK_COLOR_CYCLE = ['indigo', 'teal', 'amber', 'rose', 'violet']

export function taskColor(name) {
  return TASK_COLORS[name] || TASK_COLORS.indigo
}

export function nextColor(index) {
  return TASK_COLOR_CYCLE[index % TASK_COLOR_CYCLE.length]
}

export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance', 'HR', 'Operations']
export const LEAVE_TYPES = ['Sick', 'Casual', 'Emergency', 'Other']

import { cn } from '@/utils/cn'

export function Tooltip({ label, children, className }) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </span>
  )
}

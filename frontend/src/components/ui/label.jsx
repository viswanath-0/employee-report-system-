import { cn } from '@/utils/cn'

export function Label({ className, ...props }) {
  return (
    <label className={cn('block text-sm font-medium text-slate-700 mb-1.5', className)} {...props} />
  )
}

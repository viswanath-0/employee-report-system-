import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn('input-base appearance-none pr-9 cursor-pointer', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    </div>
  )
})

import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input-base min-h-[90px] resize-y', className)} {...props} />
})

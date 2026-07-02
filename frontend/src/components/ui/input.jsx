import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input-base', className)} {...props} />
})

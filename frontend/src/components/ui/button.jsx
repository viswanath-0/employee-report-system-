import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Spinner } from './spinner'

const variants = {
  default: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent',
  ghost: 'text-slate-600 hover:bg-slate-100',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-9 w-9',
}

export const Button = forwardRef(function Button(
  { className, variant = 'default', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
})

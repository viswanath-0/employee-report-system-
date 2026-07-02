import { cn } from '@/utils/cn'

export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}
export function THead({ className, ...props }) {
  return <thead className={cn('border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500', className)} {...props} />
}
export function TH({ className, ...props }) {
  return <th className={cn('px-4 py-3 font-medium', className)} {...props} />
}
export function TBody({ className, ...props }) {
  return <tbody className={cn('divide-y divide-slate-100', className)} {...props} />
}
export function TR({ className, ...props }) {
  return <tr className={cn('transition-colors hover:bg-slate-50/70', className)} {...props} />
}
export function TD({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle text-slate-700', className)} {...props} />
}

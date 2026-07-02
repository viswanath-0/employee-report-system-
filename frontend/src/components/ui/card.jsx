import { cn } from '@/utils/cn'

export function Card({ className, ...props }) {
  return <div className={cn('card', className)} {...props} />
}
export function CardHeader({ className, ...props }) {
  return <div className={cn('px-5 pt-5 pb-3', className)} {...props} />
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-semibold text-slate-900', className)} {...props} />
}
export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}
export function CardContent({ className, ...props }) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}
export function CardFooter({ className, ...props }) {
  return <div className={cn('px-5 py-4 border-t border-slate-100 flex items-center', className)} {...props} />
}

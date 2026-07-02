import { cn } from '@/utils/cn'
import { Skeleton } from '@/components/ui/skeleton'

const tones = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
}

export function MetricCard({ label, value, icon: Icon, tone = 'brand', hint, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tones[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

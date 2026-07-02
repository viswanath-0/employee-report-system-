import { hhmmToMinutes } from '@/utils/date'
import { taskColor } from '@/utils/format'
import { cn } from '@/utils/cn'

/** Read-only compact timeline preview used on manager cards and review panels. */
export function MiniTimeline({ startMin = 540, endMin = 1260, tasks = [], leave = false, className }) {
  const total = endMin - startMin
  return (
    <div className={cn('relative h-6 w-full overflow-hidden rounded-md bg-slate-100', className)}>
      {leave ? (
        <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-400">
          Leave day
        </div>
      ) : (
        tasks.map((t, i) => {
          const s = hhmmToMinutes(t.start_time)
          const e = hhmmToMinutes(t.end_time)
          const left = ((s - startMin) / total) * 100
          const width = ((e - s) / total) * 100
          return (
            <div
              key={i}
              title={t.title}
              style={{ left: `${left}%`, width: `${width}%` }}
              className={cn('absolute bottom-0.5 top-0.5 rounded-sm', taskColor(t.color).block)}
            />
          )
        })
      )}
    </div>
  )
}

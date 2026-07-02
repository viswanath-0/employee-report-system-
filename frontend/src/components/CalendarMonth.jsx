import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMonthMatrix, WEEKDAYS, MONTHS, todayISO } from '@/utils/date'
import { statusMeta } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * Month grid with a status dot per day.
 * `markers` = { 'YYYY-MM-DD': status }
 */
export function CalendarMonth({ year, month, markers = {}, onSelect, onPrev, onNext, legend = true }) {
  const weeks = getMonthMatrix(year, month)
  const today = todayISO()

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {MONTHS[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNext} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day) => {
          const status = markers[day.iso]
          const meta = status ? statusMeta(status) : null
          return (
            <button
              key={day.iso}
              onClick={() => onSelect?.(day.iso, status)}
              className={cn(
                'relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition',
                day.inMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300',
                day.iso === today && 'ring-1 ring-brand-400',
              )}
            >
              <span>{day.date.getDate()}</span>
              {meta && <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', meta.dot)} />}
            </button>
          )
        })}
      </div>

      {legend && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {['approved', 'pending', 'unapproved', 'leave'].map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', statusMeta(s).dot)} />
              {statusMeta(s).label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

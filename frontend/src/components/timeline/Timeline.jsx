import { useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { minutesToLabel, hhmmToMinutes } from '@/utils/date'
import { taskColor } from '@/utils/format'
import { cn } from '@/utils/cn'
import { notify } from '@/utils/toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const SNAP = 15 // snap selection to 15-minute increments

/**
 * Draggable day timeline (09:00–21:00 by default).
 *  - drag across empty space to select a range → onCreate({ startMin, endMin })
 *  - click an existing block → onEditTask(task)
 *  - leaveMode → greyed out + locked
 *  - mobile → drag is replaced with start/end dropdowns
 */
export function Timeline({
  startMin = 540,
  endMin = 1260,
  tasks = [],
  onCreate,
  onEditTask,
  leaveMode = false,
}) {
  const total = endMin - startMin
  const trackRef = useRef(null)
  const [sel, setSel] = useState(null) // { a, b } in minutes
  const [occupied, setOccupied] = useState(false)
  const [flash, setFlash] = useState(false)
  const isMobile = useIsMobile()

  const ranges = tasks.map((t) => ({ s: hhmmToMinutes(t.start_time), e: hhmmToMinutes(t.end_time) }))
  const overlaps = (s, e) => ranges.some((r) => s < r.e && e > r.s)

  const triggerFlash = () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 500)
  }

  const clientXToMin = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect()
    let ratio = (clientX - rect.left) / rect.width
    ratio = Math.max(0, Math.min(1, ratio))
    const m = Math.round((startMin + ratio * total) / SNAP) * SNAP
    return Math.max(startMin, Math.min(endMin, m))
  }

  const onPointerDown = (e) => {
    if (leaveMode || isMobile) return
    trackRef.current?.setPointerCapture?.(e.pointerId)
    const m = clientXToMin(e.clientX)
    setSel({ a: m, b: m })
  }
  const onPointerMove = (e) => {
    if (!sel) return
    const m = clientXToMin(e.clientX)
    const a = Math.min(sel.a, m)
    const b = Math.max(sel.a, m)
    setOccupied(overlaps(a, b))
    setSel({ a: sel.a, b: m })
  }
  const onPointerUp = () => {
    if (!sel) return
    const a = Math.min(sel.a, sel.b)
    const b = Math.max(sel.a, sel.b)
    setSel(null)
    setOccupied(false)
    if (b - a < SNAP) return // treated as a click, not a drag
    if (overlaps(a, b)) {
      triggerFlash()
      notify.error('Time slot already occupied')
      return
    }
    onCreate?.({ startMin: a, endMin: b })
  }

  const selSorted = sel ? { a: Math.min(sel.a, sel.b), b: Math.max(sel.a, sel.b) } : null

  return (
    <div className="no-select">
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={cn(
            'relative h-24 w-full overflow-hidden rounded-xl border bg-slate-50 transition',
            leaveMode ? 'cursor-not-allowed border-slate-300' : isMobile ? 'border-slate-200' : 'cursor-crosshair border-slate-200',
            flash && 'ring-2 ring-rose-400',
          )}
        >
          {/* tick marks */}
          {Array.from({ length: Math.floor(total / 30) + 1 }).map((_, i) => {
            const left = ((i * 30) / total) * 100
            const isHour = (startMin + i * 30) % 60 === 0
            return (
              <div
                key={i}
                className={cn('absolute bottom-0 top-0 w-px', isHour ? 'bg-slate-200' : 'bg-slate-100')}
                style={{ left: `${left}%` }}
              />
            )
          })}

          {/* task blocks */}
          {!leaveMode &&
            tasks.map((t, idx) => {
              const s = hhmmToMinutes(t.start_time)
              const e = hhmmToMinutes(t.end_time)
              const left = ((s - startMin) / total) * 100
              const width = ((e - s) / total) * 100
              const c = taskColor(t.color)
              return (
                <button
                  key={t.id ?? `${t.start_time}-${idx}`}
                  type="button"
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onEditTask?.(t)
                  }}
                  title={`${t.title} · ${minutesToLabel(s)}–${minutesToLabel(e)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  className={cn(
                    'group absolute bottom-2 top-2 flex flex-col justify-center overflow-hidden rounded-lg border px-2 text-left text-white shadow-sm transition hover:brightness-110',
                    c.block,
                  )}
                >
                  <span className="truncate text-xs font-semibold">{t.title}</span>
                  <span className="truncate text-[10px] opacity-90">
                    {minutesToLabel(s)}–{minutesToLabel(e)}
                  </span>
                </button>
              )
            })}

          {/* live selection */}
          {selSorted && (
            <div
              style={{
                left: `${((selSorted.a - startMin) / total) * 100}%`,
                width: `${((selSorted.b - selSorted.a) / total) * 100}%`,
              }}
              className={cn(
                'absolute bottom-2 top-2 flex items-center justify-center rounded-lg border-2 border-dashed text-[10px] font-medium',
                occupied
                  ? 'border-rose-400 bg-rose-100/70 text-rose-700'
                  : 'border-brand-400 bg-brand-100/70 text-brand-700',
              )}
            >
              {selSorted.b - selSorted.a >= 60 &&
                (occupied ? 'Occupied' : `${minutesToLabel(selSorted.a)}–${minutesToLabel(selSorted.b)}`)}
            </div>
          )}

          {/* leave overlay */}
          {leaveMode && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-200/80 text-slate-500">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-semibold">Leave Day</span>
            </div>
          )}
        </div>

        {/* hour labels */}
        <div className="relative mt-1 h-4">
          {Array.from({ length: Math.floor(total / 60) + 1 }).map((_, i) => {
            const left = ((i * 60) / total) * 100
            return (
              <span
                key={i}
                className="absolute -translate-x-1/2 text-[10px] text-slate-400"
                style={{ left: `${left}%` }}
              >
                {minutesToLabel(startMin + i * 60)}
              </span>
            )
          })}
        </div>
      </div>

      {isMobile && !leaveMode && (
        <MobileCreator startMin={startMin} endMin={endMin} overlaps={overlaps} onCreate={onCreate} />
      )}

      {!isMobile && !leaveMode && tasks.length === 0 && !sel && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Click and drag across the timeline to add a task
        </p>
      )}
    </div>
  )
}

function MobileCreator({ startMin, endMin, overlaps, onCreate }) {
  const opts = []
  for (let m = startMin; m <= endMin; m += 30) opts.push(m)
  const [s, setS] = useState(startMin)
  const [e, setE] = useState(Math.min(startMin + 60, endMin))

  const add = () => {
    if (e <= s) return notify.error('End time must be after start time')
    if (overlaps(s, e)) return notify.error('Time slot already occupied')
    onCreate?.({ startMin: s, endMin: e })
  }

  return (
    <div className="mt-3 flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-slate-500">Start</label>
        <Select value={s} onChange={(ev) => setS(+ev.target.value)}>
          {opts.map((m) => (
            <option key={m} value={m}>{minutesToLabel(m)}</option>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs text-slate-500">End</label>
        <Select value={e} onChange={(ev) => setE(+ev.target.value)}>
          {opts.map((m) => (
            <option key={m} value={m}>{minutesToLabel(m)}</option>
          ))}
        </Select>
      </div>
      <Button type="button" onClick={add}>Add</Button>
    </div>
  )
}

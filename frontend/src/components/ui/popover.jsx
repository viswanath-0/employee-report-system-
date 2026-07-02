import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

/** Lightweight click-to-open popover that closes on outside click / Escape. */
export function Popover({ trigger, children, align = 'right', className, panelClassName }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={cn('relative', className)} ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-2 rounded-xl border border-slate-200 bg-white shadow-lg animate-slide-down',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}

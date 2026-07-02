import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Dialog({
  open, onClose, title, description, children, footer, size = 'md', className,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative z-10 w-full rounded-2xl bg-white shadow-xl animate-scale-in', sizes[size], className)}>
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pt-5 pb-3">
            <div>
              {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

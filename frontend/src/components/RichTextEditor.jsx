import { useRef, useEffect } from 'react'
import { Bold, Italic, List } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Minimal rich-text editor (bold / italic / bullet list) backed by
 * contentEditable + execCommand. Emits HTML through onChange.
 */
export function RichTextEditor({ value = '', onChange, placeholder = 'Describe the task…', className }) {
  const ref = useRef(null)

  // set initial HTML once (avoids caret jumping on every keystroke)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exec = (cmd) => {
    document.execCommand(cmd, false, null)
    ref.current?.focus()
    onChange?.(ref.current.innerHTML)
  }

  const btn = 'rounded p-1.5 text-slate-600 transition hover:bg-slate-100'

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-300 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/40',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-slate-200 px-2 py-1">
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet list">
          <List className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
        className="rich-content min-h-[90px] w-full px-3 py-2 text-sm text-slate-900 focus:outline-none"
      />
    </div>
  )
}

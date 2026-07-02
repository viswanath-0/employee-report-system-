import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

const palette = [
  'bg-indigo-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-fuchsia-500',
]

function pick(name = '') {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-11 w-11 text-base', xl: 'h-14 w-14 text-lg' }

export function Avatar({ name = '', size = 'md', className }) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        pick(name),
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}

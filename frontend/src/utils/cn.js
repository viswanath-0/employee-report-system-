import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional + tailwind class names safely. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

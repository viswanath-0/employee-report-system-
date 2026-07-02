import { useEffect, useState } from 'react'
import { countdownTo, formatDuration } from '@/utils/date'

/** Live countdown to a HH:MM deadline (today). Updates every 30s. */
export function useCountdown(deadlineHHMM) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  const { diffMs, passed } = countdownTo(deadlineHHMM, now)
  return { diffMs, passed, label: formatDuration(diffMs) }
}

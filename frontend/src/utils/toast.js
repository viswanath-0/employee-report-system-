import toast from 'react-hot-toast'

export const notify = {
  success: (m) => toast.success(m),
  error: (m) => toast.error(typeof m === 'string' ? m : 'Something went wrong'),
  info: (m) => toast(m, { icon: 'ℹ️' }),
  loading: (m) => toast.loading(m),
  dismiss: (id) => toast.dismiss(id),
}

/** Extract a readable message from an axios error (FastAPI `detail`). */
export function apiError(e, fallback = 'Something went wrong') {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d[0]?.msg || fallback
  return e?.message || fallback
}

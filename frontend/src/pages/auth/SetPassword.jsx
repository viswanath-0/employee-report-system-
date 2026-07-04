import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Lock, ShieldCheck } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify, apiError } from '@/utils/toast'
import { roleHome } from '@/utils/format'
import { cn } from '@/utils/cn'

const RULES = [
  { key: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'num', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function SetPassword() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const passOk = useMemo(() => RULES.every((r) => r.test(form.next)), [form.next])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.current) return notify.error('Enter your temporary password')
    if (!passOk) return notify.error('Your new password does not meet all requirements')
    if (form.next !== form.confirm) return notify.error('Passwords do not match')
    setLoading(true)
    try {
      const { data } = await authApi.changePassword({
        current_password: form.current,
        new_password: form.next,
      })
      updateUser({ account_status: data.account_status })
      notify.success('Password updated — welcome aboard!')
      navigate(roleHome(data.role))
    } catch (err) {
      notify.error(apiError(err, 'Could not update password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <ShieldCheck className="h-3.5 w-3.5" /> First-time sign-in
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Set your password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Hi {user?.name?.split(' ')[0]} — you&apos;re signed in as{' '}
          <b className="text-slate-700">{user?.company_id || user?.email}</b>. Choose a new password to continue.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>Temporary password (from your email)</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                className="pl-9"
                placeholder="Temporary password"
                value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>New password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
            />
            {form.next.length > 0 && (
              <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {RULES.map((r) => {
                  const ok = r.test(form.next)
                  return (
                    <li key={r.key} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-600' : 'text-slate-400')}>
                      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {r.label}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <Label>Confirm new password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
            {form.confirm.length > 0 && form.confirm !== form.next && (
              <p className="mt-1 text-xs text-rose-500">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Set password &amp; continue
          </Button>
        </form>

        <button onClick={logout} className="mt-5 w-full text-center text-xs text-slate-400 hover:text-slate-600">
          Not you? Sign out
        </button>
      </div>
    </AuthShell>
  )
}

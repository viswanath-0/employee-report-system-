import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify, apiError } from '@/utils/toast'
import { roleHome } from '@/utils/format'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ login_id: '', password: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    if (!form.login_id || !form.password) return notify.error('Enter your Company ID and password')
    setLoading(true)
    try {
      const user = await login(form.login_id.trim(), form.password)
      if (user.account_status === 'password_reset_required') {
        notify.info('Set a new password to finish signing in.')
        navigate('/set-password')
      } else {
        notify.success(`Welcome back, ${user.name.split(' ')[0]}!`)
        navigate(roleHome(user.role))
      }
    } catch (err) {
      notify.error(apiError(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <img src="/logo.svg" alt="logo" className="h-9 w-9" />
          <span className="text-base font-semibold text-slate-900">Employee Report System</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-sm text-slate-500">Welcome back — please enter your details.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label>Company ID</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="EMP-0001-2026-ENG"
                value={form.login_id}
                onChange={(e) => setForm({ ...form, login_id: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              <Link
                to="/forgot-password"
                className="mb-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                className="pl-9"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have your credentials yet?{' '}
          <Link to="/create-account" className="font-medium text-brand-600 hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

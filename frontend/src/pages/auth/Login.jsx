import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
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
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    if (!form.email || !form.password) return notify.error('Enter your email and password')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      notify.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      navigate(roleHome(user.role))
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
            <Label>Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                className="pl-9"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Password</Label>
              <button
                type="button"
                onClick={() => notify.info('Please contact your administrator to reset your password.')}
                className="mb-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
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
            Login as Employee
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={loading}
            onClick={submit}
            className="w-full"
            size="lg"
          >
            Login as Manager or Admin
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Create one
          </Link>
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Demo accounts (after running the seed script):</p>
          <p className="mt-1">Admin — admin@company.com / Admin@123</p>
          <p>Manager — mona@company.com / Manager@123</p>
          <p>Employee — eddie@company.com / Employee@123</p>
        </div>
      </div>
    </AuthShell>
  )
}

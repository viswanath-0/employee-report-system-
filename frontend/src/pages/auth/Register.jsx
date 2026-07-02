import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { notify, apiError } from '@/utils/toast'
import { roleHome, DEPARTMENTS } from '@/utils/format'
import { cn } from '@/utils/cn'

const RULES = [
  { key: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'num', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('employee')
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', department: DEPARTMENTS[0], password: '', confirm: '',
    manager_id: '', manager_code: '',
  })

  useEffect(() => {
    authApi.managers().then((r) => setManagers(r.data)).catch(() => {})
  }, [])

  const passOk = useMemo(() => RULES.every((r) => r.test(form.password)), [form.password])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return notify.error('Full name is required')
    if (!passOk) return notify.error('Password does not meet all requirements')
    if (form.password !== form.confirm) return notify.error('Passwords do not match')
    if (role === 'manager' && !form.manager_code.trim())
      return notify.error('Manager code is required')

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      department: form.department,
      role,
      manager_id: role === 'employee' && form.manager_id ? Number(form.manager_id) : null,
      manager_code: role === 'manager' ? form.manager_code.trim() : null,
    }
    setLoading(true)
    try {
      const user = await register(payload)
      notify.success('Account created — welcome aboard!')
      navigate(roleHome(user.role))
    } catch (err) {
      notify.error(apiError(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="mt-1 text-sm text-slate-500">Get started in less than a minute.</p>

        {/* role toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          {['employee', 'manager'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                'rounded-md py-2 text-sm font-medium capitalize transition',
                role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label>Full name</Label>
            <Input value={form.name} onChange={set('name')} placeholder="Jane Doe" />
          </div>
          <div>
            <Label>Email address</Label>
            <Input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onChange={set('department')}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>

          {role === 'employee' ? (
            <div>
              <Label>Assigned manager</Label>
              <Select value={form.manager_id} onChange={set('manager_id')}>
                <option value="">Select your manager…</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.department ? ` — ${m.department}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <Label>Manager code</Label>
              <Input
                value={form.manager_code}
                onChange={set('manager_code')}
                placeholder="Secret code from your admin"
              />
            </div>
          )}

          <div>
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
            {form.password.length > 0 && (
              <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {RULES.map((r) => {
                  const ok = r.test(form.password)
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
            <Label>Confirm password</Label>
            <Input type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />
            {form.confirm.length > 0 && form.confirm !== form.password && (
              <p className="mt-1 text-xs text-rose-500">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

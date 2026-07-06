import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { authApi, configApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { todayISO } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'
import { cn } from '@/utils/cn'

const BLANK = {
  full_name: '', personal_email: '', department: '', role: 'employee', joining_date: '', message: '',
}

/**
 * A candidate who isn't in the directory yet sends their details to the admin.
 * The admin reviews, assigns a manager, and creates the account from the admin panel.
 */
export default function RequestAccess() {
  const [form, setForm] = useState(BLANK)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    setForm((f) => ({ ...f, joining_date: todayISO() }))
    configApi.public().then((r) => {
      const cat = r.data.department_catalog || []
      setDepartments(cat)
      setForm((f) => ({ ...f, department: cat[0]?.name || '' }))
    }).catch(() => {})
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) return notify.error('Full name is required')
    if (!form.personal_email.trim()) return notify.error('Personal email is required')
    if (!form.department) return notify.error('Please choose a department')
    setLoading(true)
    try {
      const { data } = await authApi.requestAccess({
        full_name: form.full_name.trim(),
        personal_email: form.personal_email.trim(),
        department: form.department,
        role: form.role,
        joining_date: form.joining_date,
        message: form.message.trim() || null,
      })
      setDone(data)
      if (data.ok) notify.success('Request sent to the administrator')
      else notify.error('This email is already registered')
    } catch (err) {
      notify.error(apiError(err, 'Could not send your request'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthShell>
        <div className="animate-fade-up text-center">
          {done.ok ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Request sent</h2>
              <p className="mt-2 text-sm text-slate-500">{done.message}</p>
              <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <AlertCircle className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Email already registered</h2>
              <p className="mt-2 text-sm text-slate-500">{done.message}</p>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm font-medium">
                <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
                <span className="text-slate-300">·</span>
                <Link to="/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
              </div>
              <button
                type="button"
                onClick={() => setDone(null)}
                className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                ← Use a different email
              </button>
            </>
          )}
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <h2 className="text-2xl font-bold text-slate-900">Request access</h2>
        <p className="mt-1 text-sm text-slate-500">
          Not added yet? Send your details to the administrator — they&apos;ll create your account
          (and assign your manager) and email you your login credentials.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {['employee', 'manager'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={cn(
                  'rounded-md py-2 text-sm font-medium capitalize transition',
                  form.role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <div>
            <Label>Full name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Jane Doe" value={form.full_name} onChange={set('full_name')} />
            </div>
          </div>

          <div>
            <Label>Personal email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="email" className="pl-9" placeholder="you@personal.com" value={form.personal_email} onChange={set('personal_email')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Department</Label>
              <Select value={form.department} onChange={set('department')}>
                {departments.length === 0 && <option value="">Loading…</option>}
                {departments.map((d) => (
                  <option key={d.code} value={d.name}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Joining date</Label>
              <Input type="date" value={form.joining_date} onChange={set('joining_date')} />
            </div>
          </div>

          <div>
            <Label>Message (optional)</Label>
            <Textarea value={form.message} onChange={set('message')} placeholder="Anything the admin should know…" />
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Send request to admin
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have your credentials?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  )
}

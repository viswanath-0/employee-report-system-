import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, MailCheck, AlertCircle } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { authApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify, apiError } from '@/utils/toast'

/**
 * Self-service password reset. The user proves ownership with their Company ID +
 * the personal email on file; the backend emails a fresh temporary password and
 * flags the account so the next sign-in forces a new password (via SetPassword).
 */
export default function ForgotPassword() {
  const [form, setForm] = useState({ company_id: '', personal_email: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { ok, message, admin_contact }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.company_id.trim() || !form.personal_email.trim())
      return notify.error('Enter your Company ID and personal email')
    setLoading(true)
    setResult(null)
    try {
      const { data } = await authApi.forgotPassword({
        company_id: form.company_id.trim(),
        personal_email: form.personal_email.trim(),
      })
      setResult(data)
      if (data.ok) notify.success('Temporary password sent to your email')
    } catch (err) {
      notify.error(apiError(err, 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your Company ID and the personal email on file. We&apos;ll email you a temporary
          password to sign in with — then you can set a new one.
        </p>

        {/* Success */}
        {result?.ok && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 animate-fade-in">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Check your inbox</p>
                <p className="mt-0.5">{result.message}</p>
              </div>
            </div>
            <Link to="/login" className="mt-3 inline-block font-medium text-emerald-900 underline">
              Go to sign in →
            </Link>
          </div>
        )}

        {/* Not matched */}
        {result && !result.ok && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 animate-fade-in">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">We couldn&apos;t match that</p>
              <p className="mt-0.5">{result.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>Company ID</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="EMP-0001-2026-ENG"
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Personal email on file</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                className="pl-9"
                placeholder="you@personal.com"
                value={form.personal_email}
                onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Send temporary password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

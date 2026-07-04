import { useEffect, useState } from 'react'
import { Copy, Check, CheckCircle2, Mail, MailWarning } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { configApi, authApi, adminApi } from '@/api/endpoints'
import { todayISO } from '@/utils/date'
import { notify, apiError } from '@/utils/toast'

const BLANK = { full_name: '', department_code: '', joining_date: '', role: 'employee', personal_email: '', manager_id: '' }

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-slate-900">{value}</p>
      </div>
      <button onClick={copy} className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-200" title="Copy">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function AddDirectoryUserModal({ open, onClose, onCreated, fixedRole }) {
  const roleDefault = fixedRole || 'employee'
  const [form, setForm] = useState({ ...BLANK, role: roleDefault })
  const [departments, setDepartments] = useState([])
  const [managers, setManagers] = useState([])
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null) // AdminCreateUserOut

  useEffect(() => {
    if (!open) return
    setForm({ ...BLANK, role: roleDefault, joining_date: todayISO() })
    setCreated(null)
    configApi.public().then((r) => {
      const cat = r.data.department_catalog || []
      setDepartments(cat)
      setForm((f) => ({ ...f, department_code: cat[0]?.code || '' }))
    }).catch(() => {})
    authApi.managers().then((r) => setManagers(r.data)).catch(() => {})
  }, [open])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async () => {
    if (!form.full_name.trim()) return notify.error('Full name is required')
    if (!form.personal_email.trim()) return notify.error('Personal email is required')
    if (!form.department_code) return notify.error('Choose a department')
    setBusy(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        department_code: form.department_code,
        joining_date: form.joining_date,
        role: form.role,
        personal_email: form.personal_email.trim(),
        manager_id: form.role === 'employee' && form.manager_id ? Number(form.manager_id) : null,
      }
      const { data } = await adminApi.createDirectoryUser(payload)
      setCreated(data)
      onCreated?.()
      notify.success(`Created ${data.company_id}`)
    } catch (err) {
      notify.error(apiError(err, 'Could not create the account'))
    } finally {
      setBusy(false)
    }
  }

  const addAnother = () => {
    setCreated(null)
    setForm({ ...BLANK, role: roleDefault, department_code: departments[0]?.code || '', joining_date: todayISO() })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={created ? 'Account created' : (fixedRole ? `Add ${fixedRole[0].toUpperCase()}${fixedRole.slice(1)}` : 'Add Employee / Manager')}
      description={created ? '' : 'The system generates the Company ID and a temporary password, then emails the credentials.'}
      footer={
        created ? (
          <>
            <Button variant="secondary" onClick={addAnother}>Add another</Button>
            <Button onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={busy} onClick={submit}>Create &amp; send credentials</Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <span><b>{created.full_name}</b> — {created.role} in {created.department}</span>
          </div>
          <CopyRow label="Company ID (login)" value={created.company_id} />
          <CopyRow label="Temporary password" value={created.temp_password} />
          <div className={created.email_sent
            ? 'flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
            : 'flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700'}>
            {created.email_sent ? <Mail className="h-4 w-4" /> : <MailWarning className="h-4 w-4" />}
            {created.email_sent
              ? `Credentials emailed to ${created.personal_email}.`
              : `Email isn't configured yet — share the Company ID + temp password with ${created.personal_email} manually.`}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!fixedRole && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              {['employee', 'manager'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={
                    'rounded-md py-2 text-sm font-medium capitalize transition ' +
                    (form.role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" autoFocus />
          </div>
          <div>
            <Label>Personal email</Label>
            <Input type="email" value={form.personal_email} onChange={set('personal_email')} placeholder="jane@personal.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Department</Label>
              <Select value={form.department_code} onChange={set('department_code')}>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Joining date</Label>
              <Input type="date" value={form.joining_date} onChange={set('joining_date')} />
            </div>
          </div>

          {form.role === 'employee' && (
            <div>
              <Label>Reports to (manager) — optional</Label>
              <Select value={form.manager_id} onChange={set('manager_id')}>
                <option value="">No manager yet</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.department ? ` — ${m.department}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}

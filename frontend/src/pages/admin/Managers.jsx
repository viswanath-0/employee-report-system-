import { useEffect, useState } from 'react'
import { UserPlus, UserCog, KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/api/endpoints'
import { DEPARTMENTS } from '@/utils/format'
import { cn } from '@/utils/cn'
import { notify, apiError } from '@/utils/toast'

const EMPTY_FORM = { name: '', email: '', department: DEPARTMENTS[0], password: '' }

export default function AllManagers() {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [managerCode, setManagerCode] = useState('')
  const [codeLoaded, setCodeLoaded] = useState(false)
  const [savingCode, setSavingCode] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.managers()
      .then((r) => setManagers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    adminApi.getSettings()
      .then((r) => setManagerCode(r.data?.manager_code || ''))
      .catch(() => {})
      .finally(() => setCodeLoaded(true))
  }, [])

  const submitAdd = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return notify.error('Name, email and password are required')
    }
    setSaving(true)
    try {
      await adminApi.addManager({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        department: form.department,
      })
      notify.success('Manager added')
      setShowAdd(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const saveCode = async () => {
    setSavingCode(true)
    try {
      await adminApi.updateSettings({ manager_code: managerCode })
      notify.success('Manager registration code updated')
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setSavingCode(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="All Managers"
        description="Manage every team lead and the code they register with."
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4" /> Add Manager
          </Button>
        }
      />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-brand-500" /> Manager registration code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-slate-500">
            New managers must enter this code when registering. Share it only with people who should lead a team.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>Registration code</Label>
              <Input
                value={managerCode}
                onChange={(e) => setManagerCode(e.target.value)}
                placeholder="e.g. MGR-2026"
                disabled={!codeLoaded}
              />
            </div>
            <Button onClick={saveCode} loading={savingCode} disabled={!codeLoaded} className="sm:w-auto">
              Save code
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : managers.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No managers yet"
            description="Add your first manager to start building teams."
            action={<Button onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4" /> Add Manager</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Department</TH>
                <TH>Team Size</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {managers.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <div className={cn('flex items-center gap-2.5', !m.is_active && 'opacity-50')}>
                      <Avatar name={m.name} size="sm" />
                      <span className="font-medium text-slate-900">{m.name}</span>
                    </div>
                  </TD>
                  <TD className="text-slate-500">{m.email}</TD>
                  <TD>{m.department || '—'}</TD>
                  <TD className="font-medium text-slate-900">{m.team_size ?? 0}</TD>
                  <TD>
                    {m.is_active ? (
                      <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 ring-1 ring-slate-400/20">Inactive</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Add manager modal */}
      <Dialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Manager"
        description="Create a new manager account. They'll be able to log in immediately."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={submitAdd}>Add manager</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@company.com"
            />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Set an initial password"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

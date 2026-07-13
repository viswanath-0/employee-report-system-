import { useEffect, useState } from 'react'
import { Search, Users, UserCog, UserX, Eye, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { AddDirectoryUserModal } from '@/components/modals/AddDirectoryUserModal'
import { adminApi } from '@/api/endpoints'
import { statusMeta } from '@/utils/format'
import { cn } from '@/utils/cn'
import { notify, apiError } from '@/utils/toast'

// Small colored chips summarising an employee's report statuses.
function StatusSummary({ summary }) {
  const entries = Object.entries(summary || {}).filter(([, n]) => n > 0)
  if (entries.length === 0) return <span className="text-slate-400">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([status, count]) => {
        const m = statusMeta(status)
        return (
          <span
            key={status}
            className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', m.pill)}
            title={m.label}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
            {count}
          </span>
        )
      })}
    </div>
  )
}

export default function AllEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [managers, setManagers] = useState([])
  const [reassignFor, setReassignFor] = useState(null)
  const [managerId, setManagerId] = useState('')
  const [deactivateFor, setDeactivateFor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const load = (searchTerm = search) => {
    setLoading(true)
    adminApi.employees(searchTerm)
      .then((r) => setEmployees(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load('') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e) => {
    e.preventDefault()
    load(search.trim())
  }

  const openReassign = async (emp) => {
    setReassignFor(emp)
    setManagerId(emp.manager_id ? String(emp.manager_id) : '')
    if (managers.length === 0) {
      try {
        const { data } = await adminApi.managers()
        setManagers(data)
      } catch (err) {
        notify.error(apiError(err))
      }
    }
  }

  const submitReassign = async () => {
    if (!managerId) return notify.error('Please choose a manager')
    setBusy(true)
    try {
      await adminApi.reassign(reassignFor.id, Number(managerId))
      notify.success('Manager reassigned')
      setReassignFor(null)
      setManagerId('')
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  const submitDeactivate = async () => {
    setBusy(true)
    try {
      await adminApi.deactivate(deactivateFor.id)
      notify.success('Employee deactivated')
      setDeactivateFor(null)
      load()
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="All Employees"
        description="Employees who have activated their account. A new hire appears here once they log in and set their own password."
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4" /> Add Employee
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or department…"
            />
          </div>
          <Button type="submit" className="sm:w-auto">
            <Search className="h-4 w-4" /> Search
          </Button>
        </form>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="Try a different search term."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Department</TH>
                <TH>Assigned Manager</TH>
                <TH>Total Reports</TH>
                <TH>Status Summary</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {employees.map((emp) => (
                <TR key={emp.id}>
                  <TD>
                    <div className={cn('flex items-center gap-2.5', !emp.is_active && 'opacity-50')}>
                      <Avatar name={emp.name} size="sm" />
                      <span className="font-medium text-slate-900">{emp.name}</span>
                      {!emp.is_active && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          INACTIVE
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD className="text-slate-500">{emp.email}</TD>
                  <TD>{emp.department || '—'}</TD>
                  <TD>{emp.manager_name || '—'}</TD>
                  <TD className="font-medium text-slate-900">{emp.total_reports ?? 0}</TD>
                  <TD><StatusSummary summary={emp.status_summary} /></TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => notify.info(`${emp.name} — ${emp.email}`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button size="sm" variant="subtle" onClick={() => openReassign(emp)}>
                        <UserCog className="h-3.5 w-3.5" /> Reassign
                      </Button>
                      {emp.is_active && (
                        <Button size="sm" variant="secondary" onClick={() => setDeactivateFor(emp)}>
                          <UserX className="h-3.5 w-3.5" /> Deactivate
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Reassign manager modal */}
      <Dialog
        open={!!reassignFor}
        onClose={() => setReassignFor(null)}
        title="Reassign Manager"
        description={reassignFor ? `Choose a new manager for ${reassignFor.name}.` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReassignFor(null)}>Cancel</Button>
            <Button loading={busy} onClick={submitReassign}>Reassign</Button>
          </>
        }
      >
        <Label>Manager</Label>
        <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">Select a manager…</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}{m.department ? ` — ${m.department}` : ''}
            </option>
          ))}
        </Select>
      </Dialog>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={!!deactivateFor}
        onClose={() => setDeactivateFor(null)}
        onConfirm={submitDeactivate}
        title="Deactivate employee?"
        description={deactivateFor ? `${deactivateFor.name} will no longer be able to log in or submit reports. This can be reversed by an admin.` : ''}
        confirmText="Deactivate"
        variant="danger"
        loading={busy}
      />

      <AddDirectoryUserModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => load()}
        fixedRole="employee"
      />
    </div>
  )
}

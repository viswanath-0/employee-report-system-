import { useEffect, useState } from 'react'
import { Download, FileText, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/table'
import { StatusBadge, LeaveStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { adminApi } from '@/api/endpoints'
import { ddmmyyyy } from '@/utils/date'
import { DEPARTMENTS } from '@/utils/format'
import { notify, apiError } from '@/utils/toast'

const EMPTY_FILTERS = { status: 'all', department: 'all', date_from: '', date_to: '' }

// Build an API params object, dropping the sentinel 'all'/empty values.
function toParams(f) {
  const params = {}
  if (f.status !== 'all') params.status = f.status
  if (f.department !== 'all') params.department = f.department
  if (f.date_from) params.date_from = f.date_from
  if (f.date_to) params.date_to = f.date_to
  return params
}

export default function AllReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const load = (f = filters) => {
    setLoading(true)
    adminApi.reports(toParams(f))
      .then((r) => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => load(filters)

  const reopen = async (id) => {
    try {
      await adminApi.reopenReport(id)
      notify.success('Report re-opened — the manager can review it again')
      load()
    } catch (err) {
      notify.error(apiError(err))
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await adminApi.exportReports(toParams(filters))
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'reports_export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      notify.success('Export downloaded')
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="All Reports"
        description="Every report submitted across the company. Filter and export as needed."
        actions={
          <Button variant="secondary" onClick={exportCsv} loading={exporting}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <Label>Status</Label>
            <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="unapproved">Unapproved</option>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
              <option value="all">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          </div>
          <Button onClick={applyFilters} className="w-full lg:w-auto">Apply filters</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports found"
            description="Try adjusting your filters to widen the search."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Department</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH>Tasks</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {reports.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.employee?.name} size="sm" />
                      <span className="font-medium text-slate-900">{r.employee?.name || '—'}</span>
                    </div>
                  </TD>
                  <TD>{r.employee?.department || '—'}</TD>
                  <TD className="text-slate-600">{ddmmyyyy(r.date)}</TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      {r.leave
                        ? <LeaveStatusBadge status={r.leave.status} />
                        : <StatusBadge status={r.status} late={r.is_late} />}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${r.leave ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.leave ? 'Leave' : 'Task'}
                      </span>
                    </div>
                  </TD>
                  <TD>{r.leave ? '—' : (r.tasks_count ?? 0)}</TD>
                  <TD className="text-right">
                    {r.locked && (
                      <Button size="sm" variant="secondary" onClick={() => reopen(r.id)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Re-open
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

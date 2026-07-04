import { useEffect, useState } from 'react'
import { UserPlus, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AddDirectoryUserModal } from '@/components/modals/AddDirectoryUserModal'
import { adminApi } from '@/api/endpoints'
import { cn } from '@/utils/cn'

export default function AllManagers() {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.managers().then((r) => setManagers(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div>
      <PageHeader
        title="All Managers"
        description="Every team lead and the size of their team."
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <UserPlus className="h-4 w-4" /> Add Employee/Manager
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : managers.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No managers yet"
            description="Use “Add Employee/Manager” to provision your first team lead."
            action={<Button onClick={() => setShowAdd(true)}><UserPlus className="h-4 w-4" /> Add Employee/Manager</Button>}
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

      <AddDirectoryUserModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={() => load()} />
    </div>
  )
}

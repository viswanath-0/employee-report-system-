import { useEffect, useState } from 'react'
import { Building2, Users, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { adminApi } from '@/api/endpoints'

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.departments()
      .then((r) => setDepartments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader title="Departments" description="Headcount and leadership across every department." />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Departments appear here as employees and managers are added."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.name} className="transition hover:shadow-card-hover">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Building2 className="h-6 w-6" />
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{d.name}</h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" /> Employees
                    </div>
                    <p className="mt-1 text-xl font-bold text-slate-900">{d.employees ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <UserCog className="h-3.5 w-3.5" /> Managers
                    </div>
                    <p className="mt-1 text-xl font-bold text-slate-900">{d.managers ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/endpoints'
import { DEPARTMENTS } from '@/utils/format'
import { notify, apiError } from '@/utils/toast'

export function ProfileSettings() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0])
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name, department }
      if (password) payload.password = password
      const { data } = await authApi.updateProfile(payload)
      updateUser({ name: data.name, department: data.department })
      setPassword('')
      notify.success('Profile updated')
    } catch (err) {
      notify.error(apiError(err, 'Could not update profile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Profile Settings" description="Manage your personal information and password." />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <Avatar name={user?.name} size="xl" />
            <p className="mt-3 font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="mt-2 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700">
              {user?.role}
            </span>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email} disabled />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

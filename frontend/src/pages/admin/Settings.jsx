import { useEffect, useState } from 'react'
import { Building2, Clock, Bell, ImageOff } from 'lucide-react'
import { PageHeader } from '@/components/layouts/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { FileUpload } from '@/components/FileUpload'
import { adminApi } from '@/api/endpoints'
import { fileUrl } from '@/api/axios'
import { notify, apiError } from '@/utils/toast'

const EMPTY = {
  company_name: '',
  logo_path: '',
  deadline_time: '',
  work_day_start: '',
  work_day_end: '',
  email_enabled: false,
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    adminApi.getSettings()
      .then((r) => setSettings({ ...EMPTY, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (patch) => setSettings((s) => ({ ...s, ...patch }))

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await adminApi.updateSettings({
        company_name: settings.company_name,
        logo_path: settings.logo_path,
        deadline_time: settings.deadline_time,
        work_day_start: settings.work_day_start,
        work_day_end: settings.work_day_end,
        email_enabled: settings.email_enabled,
      })
      setSettings({ ...EMPTY, ...data })
      notify.success('Settings saved')
    } catch (err) {
      notify.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" description="Company-wide configuration for the report system." />
        <div className="space-y-5">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company-wide configuration for the report system."
        actions={<Button onClick={save} loading={saving}>Save changes</Button>}
      />

      <div className="space-y-5">
        {/* Company */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-500" /> Company
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company name</Label>
              <Input
                value={settings.company_name}
                onChange={(e) => set({ company_name: e.target.value })}
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <Label>Company logo</Label>
              <div className="mb-3 flex items-center gap-3">
                {settings.logo_path ? (
                  <img
                    src={fileUrl(settings.logo_path)}
                    alt="Company logo"
                    className="h-14 w-14 rounded-lg border border-slate-200 object-contain bg-white p-1"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  {settings.logo_path ? 'Current logo. Upload a new file to replace it.' : 'No logo uploaded yet.'}
                </p>
              </div>
              <FileUpload
                value={[]}
                onChange={(files) => {
                  const f = files[0]
                  if (f) set({ logo_path: f.file_path })
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Deadline & working day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-500" /> Deadline &amp; working day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Report deadline</Label>
                <Input type="time" value={settings.deadline_time} onChange={(e) => set({ deadline_time: e.target.value })} />
              </div>
              <div>
                <Label>Work day start</Label>
                <Input type="time" value={settings.work_day_start} onChange={(e) => set({ work_day_start: e.target.value })} />
              </div>
              <div>
                <Label>Work day end</Label>
                <Input type="time" value={settings.work_day_end} onChange={(e) => set({ work_day_end: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-500" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">Email notifications</p>
                <p className="text-xs text-slate-500">Send email alerts for report status changes and reminders.</p>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(v) => set({ email_enabled: v })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

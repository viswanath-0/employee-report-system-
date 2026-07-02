import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/RichTextEditor'
import { FileUpload } from '@/components/FileUpload'
import { minutesToLabel } from '@/utils/date'
import { notify } from '@/utils/toast'

/**
 * Slide-in form for creating/editing a timeline task.
 * `draft` = { id?, startMin, endMin, title, description, color, files }
 */
export function TaskFormPanel({ draft, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(draft.title || '')
  const [description, setDescription] = useState(draft.description || '')
  const [files, setFiles] = useState(draft.files || [])

  const save = () => {
    if (!title.trim()) return notify.error('Task title is required')
    onSave({ ...draft, title: title.trim(), description, files })
  }

  return (
    <div className="animate-fade-up rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{draft.id ? 'Edit task' : 'New task'}</h4>
          <p className="text-xs text-slate-500">
            {minutesToLabel(draft.startMin)} – {minutesToLabel(draft.endMin)}
          </p>
        </div>
        {draft.id && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label>Task title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement dashboard API"
            autoFocus
          />
        </div>
        <div>
          <Label>Description</Label>
          <RichTextEditor value={description} onChange={setDescription} />
        </div>
        <div>
          <Label>Attachments</Label>
          <FileUpload value={files} onChange={setFiles} />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Save Task</Button>
      </div>
    </div>
  )
}

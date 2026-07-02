import { useRef, useState } from 'react'
import { UploadCloud, File as FileIcon, X, Loader2 } from 'lucide-react'
import { filesApi } from '@/api/endpoints'
import { fileUrl } from '@/api/axios'
import { fileSize } from '@/utils/format'
import { notify, apiError } from '@/utils/toast'
import { cn } from '@/utils/cn'

const MAX_MB = 10
const isImage = (name = '') => /\.(png|jpe?g|gif|webp|svg)$/i.test(name)

/**
 * Drag-and-drop upload zone. Uploads each file immediately and tracks the
 * resulting {file_name, file_path, file_size, url} objects via `value`/`onChange`.
 */
export function FileUpload({ value = [], onChange, className }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList)
    setBusy(true)
    const added = []
    for (const f of files) {
      if (f.size > MAX_MB * 1024 * 1024) {
        notify.error(`${f.name} exceeds the ${MAX_MB}MB limit`)
        continue
      }
      try {
        const { data } = await filesApi.upload(f)
        added.push(data)
      } catch (e) {
        notify.error(apiError(e, `Failed to upload ${f.name}`))
      }
    }
    if (added.length) onChange?.([...value, ...added])
    setBusy(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const remove = (i) => onChange?.(value.filter((_, idx) => idx !== i))

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition',
          drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50',
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        ) : (
          <UploadCloud className="h-6 w-6 text-slate-400" />
        )}
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-brand-600">Click to upload</span> or drag &amp; drop
        </p>
        <p className="text-xs text-slate-400">Images, PDF, Docs up to {MAX_MB}MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
        />
      </div>

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((f, i) => (
            <div
              key={i}
              className="group relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
            >
              {isImage(f.file_name) ? (
                <img src={fileUrl(f.url || f.file_path)} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100">
                  <FileIcon className="h-5 w-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{f.file_name}</p>
                <p className="text-[11px] text-slate-400">{fileSize(f.file_size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(i) }}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 opacity-0 shadow ring-1 ring-slate-200 transition group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

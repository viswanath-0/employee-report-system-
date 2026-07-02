import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant} loading={loading} onClick={onConfirm}>{confirmText}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{description}</p>
    </Dialog>
  )
}

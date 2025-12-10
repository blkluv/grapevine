import { OriginalDialog, Button } from '@/components/ui';

interface DeleteEntryDialogProps {
  isOpen: boolean
  entryName: string
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteEntryDialog({
  isOpen,
  entryName,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteEntryDialogProps) {
  return (
    <OriginalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
      disabled={isDeleting}
      maxWidth="md"
    >
      {/* Body */}
      <div className="p-6 bg-win95-paper">
        <p className="text-lg mb-2">
          Are you sure you want to delete this entry?
        </p>
        <p className="text-lg font-bold mb-4">
          "{entryName}"
        </p>
        <p className="text-sm text-grapevine-red font-bold uppercase">
          This action cannot be undone.
        </p>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-win-gray-dark p-4 flex gap-3 justify-end bg-win95-paper">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Entry'}
        </Button>
      </div>
    </OriginalDialog>
  )
}

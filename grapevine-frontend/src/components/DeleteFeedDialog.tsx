import { OriginalDialog, Button } from '@/components/ui';

interface DeleteFeedDialogProps {
  isOpen: boolean
  feedName: string
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteFeedDialog({
  isOpen,
  feedName,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteFeedDialogProps) {
  return (
    <OriginalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
      disabled={isDeleting}
      maxWidth="md"
    >
      {/* Body */}
      <div className="p-6 bg-[#c0c0c0]">
        <p className="text-lg mb-2">
          Are you sure you want to delete this feed?
        </p>
        <p className="text-lg font-bold mb-4">
          "{feedName}"
        </p>
        <p className="text-sm text-red-600 font-bold uppercase">
          This action cannot be undone. All entries will be permanently deleted.
        </p>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#808080] p-4 flex gap-3 justify-end bg-[#c0c0c0]">
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
          {isDeleting ? 'Deleting...' : 'Delete Feed'}
        </Button>
      </div>
    </OriginalDialog>
  )
}

import { AlertDialog } from "@base-ui/react/alert-dialog"

import { Button } from "#/components/ui/button"
import type { SharedMix } from "#/lib/share-mix"

interface ConfirmSharedMixDialogProps {
  mix: SharedMix | undefined
  onApply: (mix: SharedMix) => void
  onDismiss: () => void
}

/** Asks before a shared link replaces the listener's current mixer settings. */
export function ConfirmSharedMixDialog({
  mix,
  onApply,
  onDismiss,
}: ConfirmSharedMixDialogProps) {
  return (
    <AlertDialog.Root
      open={Boolean(mix)}
      onOpenChange={(open) => {
        if (!open) onDismiss()
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[200] bg-[oklch(20%_0.02_250_/_0.38)] backdrop-blur-[2px]" />
        <AlertDialog.Viewport className="fixed inset-0 z-[201] grid place-items-center p-4">
          <AlertDialog.Popup className="grid w-full max-w-sm gap-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-5 text-[var(--ink)] shadow-[0_1.25rem_3rem_oklch(20%_0.02_250_/_0.22)]">
            <div className="grid gap-1.5">
              <AlertDialog.Title className="text-lg font-bold">
                Apply shared mix?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm leading-5 text-[var(--ink-soft)]">
                This link contains {mix?.channels.length ?? 0} sound
                {mix?.channels.length === 1 ? "" : "s"}, plus its tempo and
                master volume. It will replace the mix currently on this device.
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onDismiss}>
                Keep current mix
              </Button>
              <Button
                onClick={() => {
                  if (mix) onApply(mix)
                }}
              >
                Apply mix
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

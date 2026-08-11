import { IconCheck, IconLink } from "nucleo-micro-bold"
import { useRef, useState } from "react"

import { Button } from "#/components/ui/button"
import type { MixerSnapshot } from "#/lib/mixer-store"
import { createShareUrl } from "#/lib/share-mix"

interface ShareMixButtonProps {
  snapshot: MixerSnapshot
}

/**
 * Copies a URL that recreates the currently audible mix without storing it
 * remotely.
 */
export function ShareMixButton({ snapshot }: ShareMixButtonProps) {
  const [status, setStatus] = useState<"copied" | "failed" | undefined>(
    undefined,
  )
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  const copyShareLink = async () => {
    const shareUrl = createShareUrl(
      {
        version: 1,
        channels: snapshot.channels.map(
          ({ trackId, volume, pan, tone, muted, solo }) => ({
            trackId,
            volume,
            pan,
            tone,
            muted,
            solo,
          }),
        ),
        masterVolume: snapshot.masterVolume,
        bpm: snapshot.bpm,
      },
      window.location,
    )

    try {
      await navigator.clipboard.writeText(shareUrl)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }

    window.clearTimeout(resetTimeoutRef.current)
    resetTimeoutRef.current = window.setTimeout(
      () => setStatus(undefined),
      2_000,
    )
  }

  const isCopied = status === "copied"

  return (
    <Button
      className="h-13 min-h-13 rounded-2xl px-[0.85rem]"
      variant="skeuomorphic"
      size="lg"
      type="button"
      onClick={() => void copyShareLink()}
    >
      {isCopied ? <IconCheck /> : <IconLink />}
      {isCopied ? "Copied" : "Share"}
      <span className="sr-only" aria-live="polite">
        {status === "copied"
          ? "Share link copied to clipboard."
          : status === "failed"
            ? "Could not copy the share link."
            : ""}
      </span>
    </Button>
  )
}

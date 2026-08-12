import { IconCheck, IconLink } from "nucleo-micro-bold"
import { useEffect, useRef, useState } from "react"

import { Button } from "#/components/ui/button"
import type { MixerSnapshot } from "#/lib/mixer-store"
import { createShareUrl } from "#/lib/share-mix"

interface ShareMixButtonProps {
  snapshot: MixerSnapshot
}

/**
 * Shares a URL that recreates the currently audible mix without storing it
 * remotely. The native share sheet keeps the entire stateful URL together in
 * apps such as Messages; copying is retained as a fallback.
 */
export function ShareMixButton({ snapshot }: ShareMixButtonProps) {
  const [status, setStatus] = useState<
    "shared" | "copied" | "failed" | undefined
  >(undefined)
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(resetTimeoutRef.current), [])

  const resetStatusAfterDelay = () => {
    window.clearTimeout(resetTimeoutRef.current)
    resetTimeoutRef.current = window.setTimeout(
      () => setStatus(undefined),
      2_000,
    )
  }

  const shareMix = async () => {
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

    if (navigator.share) {
      try {
        await navigator.share({ title: "Focus FM mix", url: shareUrl })
        setStatus("shared")
        resetStatusAfterDelay()
      } catch (error) {
        // Closing the system share sheet is not an error the UI needs to report.
        if (error instanceof DOMException && error.name === "AbortError") return
        setStatus("failed")
        resetStatusAfterDelay()
      }
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
    resetStatusAfterDelay()
  }

  const didShare = status === "shared" || status === "copied"

  return (
    <Button
      className="h-13 min-h-13 rounded-2xl px-[0.85rem]"
      variant="skeuomorphic"
      size="lg"
      type="button"
      onClick={() => void shareMix()}
    >
      {didShare ? <IconCheck /> : <IconLink />}
      {status === "shared"
        ? "Shared"
        : status === "copied"
          ? "Copied"
          : "Share"}
      <span className="sr-only" aria-live="polite">
        {status === "shared"
          ? "Mix shared."
          : status === "copied"
            ? "Share link copied to clipboard."
            : status === "failed"
              ? "Could not copy the share link."
              : ""}
      </span>
    </Button>
  )
}

import { IconCheck, IconPlus } from "nucleo-micro-bold"
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react"

import { SoundIcon } from "#/components/sound-icon"
import { Toggle } from "#/components/ui/toggle"
import type { TrackDefinition, TrackId } from "#/data/tracks"

const PREVIEW_HOLD_DELAY = 260
const PRESS_MOVE_TOLERANCE = 7

interface SoundLibraryItemProps {
  track: TrackDefinition
  isActive: boolean
  onToggle: (trackId: TrackId) => void
  onPreviewPrepare: () => void
  onPreviewStart: (trackId: TrackId) => void
  onPreviewEnd: () => void
}

/** Renders a toggleable sound with a click-suppressing hold-to-preview gesture. */
export function SoundLibraryItem({
  track,
  isActive,
  onToggle,
  onPreviewPrepare,
  onPreviewStart,
  onPreviewEnd,
}: SoundLibraryItemProps) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pressOriginRef = useRef<{ x: number; y: number }>(undefined)
  const hasPreparedPreviewRef = useRef(false)
  const isPreviewingRef = useRef(false)
  const suppressClickRef = useRef(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const clearHoldTimer = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = undefined
  }

  const stopPreparedPreview = () => {
    if (!hasPreparedPreviewRef.current) return
    hasPreparedPreviewRef.current = false
    isPreviewingRef.current = false
    setIsPreviewing(false)
    onPreviewEnd()
  }

  const cleanup = useEffectEvent(() => {
    clearHoldTimer()
    if (hasPreparedPreviewRef.current) onPreviewEnd()
  })

  useEffect(() => () => cleanup(), [])

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    suppressClickRef.current = false
    pressOriginRef.current = { x: event.clientX, y: event.clientY }
    hasPreparedPreviewRef.current = true
    onPreviewPrepare()
    event.currentTarget.setPointerCapture(event.pointerId)
    holdTimerRef.current = setTimeout(() => {
      isPreviewingRef.current = true
      suppressClickRef.current = true
      setIsPreviewing(true)
      onPreviewStart(track.id)
    }, PREVIEW_HOLD_DELAY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = pressOriginRef.current
    if (!origin || !holdTimerRef.current) return
    if (
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) <=
      PRESS_MOVE_TOLERANCE
    ) {
      return
    }
    suppressClickRef.current = true
    clearHoldTimer()
    stopPreparedPreview()
  }

  const handlePointerEnd = () => {
    clearHoldTimer()
    pressOriginRef.current = undefined
    stopPreparedPreview()
  }

  const handleClickCapture = (event: MouseEvent<HTMLButtonElement>) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <Toggle
      className="group/sound grid h-auto min-h-12 w-full grid-cols-[auto_1fr_auto] items-center gap-[0.55rem] rounded-[0.8rem] px-2 py-[0.4rem] text-left whitespace-normal duration-100 enabled:hover:bg-[var(--paper-deep)] data-pressed:bg-[var(--paper-deep)] data-pressed:shadow-[inset_0_0_0_1px_var(--line)] data-previewing:scale-[0.985] data-previewing:bg-[var(--ink)] data-previewing:text-[var(--surface)] data-previewing:shadow-[inset_0_0_0_1px_var(--ink)]"
      pressed={isActive}
      data-previewing={isPreviewing || undefined}
      onPressedChange={() => onToggle(track.id)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onClickCapture={handleClickCapture}
      aria-label={`${isActive ? "Remove" : "Add"} ${track.name}. Hold to preview.`}
    >
      <SoundIcon
        className="flex-none text-[var(--ink)] group-data-previewing/sound:text-[var(--surface)]"
        trackId={track.id}
        size={22}
      />
      <span className="grid min-w-0 gap-[0.08rem]">
        <strong className="overflow-hidden text-[0.72rem] text-ellipsis whitespace-nowrap">
          {track.name}
        </strong>
      </span>
      <span
        className="grid size-[1.3rem] place-items-center rounded-[0.38rem] border border-[var(--line-strong)] text-[var(--ink-soft)] group-data-pressed/sound:border-[var(--ink)] group-data-pressed/sound:bg-[var(--ink)] group-data-pressed/sound:text-[var(--surface)] group-data-previewing/sound:border-[var(--surface)] group-data-previewing/sound:bg-transparent group-data-previewing/sound:text-[var(--surface)] [&_svg]:size-[0.9rem]"
        aria-hidden="true"
      >
        {isActive ? <IconCheck /> : <IconPlus />}
      </span>
      <span className="sr-only">{isActive ? "Added" : "Add track"}</span>
    </Toggle>
  )
}

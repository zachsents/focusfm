import { IconPlus } from "nucleo-micro-bold"
import { useState } from "react"

import { SoundLibraryItem } from "#/components/sound-library-item"
import { Button } from "#/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group"
import { TRACK_LIBRARY, type TrackCategory, type TrackId } from "#/data/tracks"

interface TrackLibraryProps {
  activeTrackIds: ReadonlySet<TrackId>
  onToggleTrack: (trackId: TrackId) => void
  onPreviewPrepare: () => void
  onPreviewStart: (trackId: TrackId) => void
  onPreviewEnd: () => void
}

const FILTERS: ReadonlyArray<{ id: "all" | TrackCategory; name: string }> = [
  { id: "all", name: "All" },
  { id: "noise", name: "Noise" },
  { id: "world", name: "World" },
  { id: "rhythm", name: "Rhythm" },
  { id: "tone", name: "Tone" },
]

/** Opens a compact shadcn sound picker without consuming mixer space. */
export function TrackLibrary({
  activeTrackIds,
  onToggleTrack,
  onPreviewPrepare,
  onPreviewStart,
  onPreviewEnd,
}: TrackLibraryProps) {
  const [filter, setFilter] = useState<"all" | TrackCategory>("all")
  const [isOpen, setIsOpen] = useState(false)
  const visibleTracks = TRACK_LIBRARY.filter(
    (track) => filter === "all" || track.category === filter,
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            className="h-13 min-h-13 rounded-2xl px-[0.85rem]"
            size="lg"
            variant="skeuomorphic"
            aria-label="Add sound"
          />
        }
      >
        <IconPlus data-icon="inline-start" />
        Add
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[min(34rem,calc(100dvh-6rem))] w-[min(39rem,calc(100vw-1.5rem))] gap-[0.8rem] overflow-hidden rounded-[1.1rem] p-4"
        align="end"
        side="bottom"
        sideOffset={10}
      >
        <PopoverHeader className="shrink-0">
          <PopoverTitle>Sound library</PopoverTitle>
        </PopoverHeader>

        <ToggleGroup
          className="w-full shrink-0 gap-1 overflow-x-auto pb-[0.1rem] [scrollbar-width:none]"
          aria-label="Filter sound library"
          value={[filter]}
          onValueChange={(values) => {
            const nextFilter = FILTERS.find((item) => item.id === values[0])?.id
            if (nextFilter) setFilter(nextFilter)
          }}
        >
          {FILTERS.map((item) => (
            <ToggleGroupItem
              className="min-h-8 rounded-full text-[0.68rem] text-[var(--ink-soft)] data-pressed:bg-[var(--ink)] data-pressed:text-[var(--surface)]"
              key={item.id}
              value={item.id}
            >
              {item.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="grid min-h-0 flex-[1_1_auto] grid-cols-3 content-start gap-[0.4rem] overflow-y-auto overscroll-contain pr-[0.2rem] [scrollbar-gutter:stable]">
          {visibleTracks.map((track) => (
            <SoundLibraryItem
              key={track.id}
              track={track}
              isActive={activeTrackIds.has(track.id)}
              onToggle={onToggleTrack}
              onPreviewPrepare={onPreviewPrepare}
              onPreviewStart={onPreviewStart}
              onPreviewEnd={onPreviewEnd}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

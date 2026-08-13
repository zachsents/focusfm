import { IconCircleMusicNoteOutlineDuo18 } from "nucleo-ui-outline-duo-18"

import { Button } from "#/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover"
import { Toggle } from "#/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group"
import {
  MEDITATION_CHIME_INTERVALS,
  type MeditationChimeInterval,
  type MeditationChimeSettings,
} from "#/lib/meditation-chime"

interface MeditationChimePanelProps {
  settings: MeditationChimeSettings
  onChange: (settings: MeditationChimeSettings) => void
  onPreview: () => void
}

/** Controls an audio-only singing-bowl presence reminder. */
export function MeditationChimePanel({
  settings,
  onChange,
  onPreview,
}: MeditationChimePanelProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="h-13 min-h-13 rounded-2xl px-[0.85rem]"
            size="lg"
            variant="skeuomorphic"
            aria-label={`Meditation chime. ${settings.enabled ? `Every ${settings.intervalMinutes} minutes` : "Off"}`}
          />
        }
      >
        <IconCircleMusicNoteOutlineDuo18 data-icon="inline-start" />
        Chime
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(25rem,calc(100vw-1.5rem))] gap-4 rounded-[1.1rem] p-4"
        align="end"
        side="bottom"
        sideOffset={10}
      >
        <PopoverHeader>
          <PopoverTitle>Meditation presence chime</PopoverTitle>
          <PopoverDescription>
            A gentle singing bowl reminds you to pause and return to the
            present. Audio only—no notification or visual interruption.
          </PopoverDescription>
        </PopoverHeader>

        <Toggle
          className="h-auto min-h-12 w-full justify-between rounded-[0.7rem] px-3 text-left"
          variant="skeuomorphic"
          pressed={settings.enabled}
          onPressedChange={(enabled) => {
            onChange({ ...settings, enabled })
            if (enabled) onPreview()
          }}
        >
          <span className="text-[0.7rem] font-bold">Presence chime</span>
          <span className="text-[0.62rem] font-bold tracking-[0.08em] uppercase">
            {settings.enabled ? "On" : "Off"}
          </span>
        </Toggle>

        <fieldset
          className="grid gap-2 disabled:pointer-events-none disabled:opacity-40"
          disabled={!settings.enabled}
        >
          <legend className="mb-1 text-xs font-bold tracking-[0.08em] text-[var(--ink-soft)] uppercase">
            Interval
          </legend>
          <ToggleGroup
            className="grid w-full grid-cols-5 gap-1"
            aria-label="Meditation chime interval"
            value={[String(settings.intervalMinutes)]}
            onValueChange={(values) => {
              const intervalMinutes = Number(
                values[0],
              ) as MeditationChimeInterval
              if (MEDITATION_CHIME_INTERVALS.includes(intervalMinutes)) {
                onChange({ ...settings, intervalMinutes })
              }
            }}
          >
            {MEDITATION_CHIME_INTERVALS.map((minutes) => (
              <ToggleGroupItem
                className="min-h-10 rounded-[0.7rem] text-[0.68rem] font-bold data-pressed:bg-[var(--ink)] data-pressed:text-[var(--surface)]"
                key={minutes}
                value={String(minutes)}
              >
                {minutes}m
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <Button
          className="w-full rounded-[0.7rem]"
          variant="skeuomorphic"
          size="sm"
          onClick={onPreview}
        >
          Preview bowl
        </Button>
      </PopoverContent>
    </Popover>
  )
}

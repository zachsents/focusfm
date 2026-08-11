import { IconWaveformLinesOutlineDuo18 } from "nucleo-ui-outline-duo-18"

import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group"
import {
  NEURAL_MODULATION_DEPTHS,
  NEURAL_MODULATION_FREQUENCIES,
  type NeuralModulationIntensity,
  type NeuralModulationMode,
  type NeuralModulationSettings,
} from "#/lib/neural-modulation"

interface NeuralModulationPanelProps {
  settings: NeuralModulationSettings
  onChange: (settings: NeuralModulationSettings) => void
}

const MODES: ReadonlyArray<{
  id: NeuralModulationMode
  name: string
  detail: string
}> = [
  { id: "off", name: "Off", detail: "No modulation" },
  { id: "gentle", name: "Gentle", detail: "8 Hz" },
  { id: "focus", name: "Focus", detail: "14 Hz" },
  { id: "deep", name: "Deep", detail: "20 Hz" },
]

const INTENSITIES: ReadonlyArray<{
  id: NeuralModulationIntensity
  name: string
  detail: string
}> = [
  { id: "soft", name: "Soft", detail: "18%" },
  { id: "balanced", name: "Balanced", detail: "36%" },
  { id: "strong", name: "Strong", detail: "60%" },
]

/** Controls experimental amplitude modulation across the complete mix. */
export function NeuralModulationPanel({
  settings,
  onChange,
}: NeuralModulationPanelProps) {
  const activeMode = MODES.find((mode) => mode.id === settings.mode)
  const activeFrequency = NEURAL_MODULATION_FREQUENCIES[settings.mode]
  const activeDepth = Math.round(
    NEURAL_MODULATION_DEPTHS[settings.intensity] * 100,
  )

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="h-13 min-h-13 rounded-2xl px-[0.85rem]"
            size="lg"
            variant="skeuomorphic"
            aria-label={`Neural modulation beta. ${activeMode?.name ?? "Off"}`}
          />
        }
      >
        <IconWaveformLinesOutlineDuo18 data-icon="inline-start" />
        Neural
        <Badge
          className="h-4 bg-[var(--ink)] px-1.5 text-[0.55rem] text-[var(--surface)]"
          variant="secondary"
        >
          Beta
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(25rem,calc(100vw-1.5rem))] gap-4 rounded-[1.1rem] p-4"
        align="end"
        side="bottom"
        sideOffset={10}
      >
        <PopoverHeader>
          <div className="flex items-center gap-2">
            <PopoverTitle>Neural modulation</PopoverTitle>
            <Badge variant="outline">Beta</Badge>
          </div>
          <PopoverDescription>
            Adds a fast rhythmic texture across your full mix. Experimental—not
            a medical treatment.
          </PopoverDescription>
        </PopoverHeader>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs font-bold tracking-[0.08em] text-[var(--ink-soft)] uppercase">
            Mode
          </legend>
          <ToggleGroup
            className="grid w-full grid-cols-4 gap-1"
            aria-label="Neural modulation mode"
            value={[settings.mode]}
            onValueChange={(values) => {
              const mode = MODES.find((item) => item.id === values[0])?.id
              if (mode) onChange({ ...settings, mode })
            }}
          >
            {MODES.map((mode) => (
              <ToggleGroupItem
                className="h-auto min-h-12 flex-col gap-0 rounded-[0.7rem] px-1 text-[0.68rem] data-pressed:bg-[var(--ink)] data-pressed:text-[var(--surface)]"
                key={mode.id}
                value={mode.id}
              >
                <span className="font-bold">{mode.name}</span>
                <span className="text-[0.58rem] opacity-65">{mode.detail}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <fieldset
          className="grid gap-2 disabled:pointer-events-none disabled:opacity-40"
          disabled={settings.mode === "off"}
        >
          <legend className="mb-1 text-xs font-bold tracking-[0.08em] text-[var(--ink-soft)] uppercase">
            Intensity
          </legend>
          <ToggleGroup
            className="grid w-full grid-cols-3 gap-1"
            aria-label="Neural modulation intensity"
            value={[settings.intensity]}
            onValueChange={(values) => {
              const intensity = INTENSITIES.find(
                (item) => item.id === values[0],
              )?.id
              if (intensity) onChange({ ...settings, intensity })
            }}
          >
            {INTENSITIES.map((intensity) => (
              <ToggleGroupItem
                className="min-h-9 rounded-[0.7rem] text-[0.68rem] data-pressed:bg-[var(--ink)] data-pressed:text-[var(--surface)]"
                key={intensity.id}
                value={intensity.id}
              >
                <span className="font-bold">{intensity.name}</span>
                <span className="text-[0.58rem] opacity-65">
                  {intensity.detail}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>

        <p className="text-[0.65rem] leading-relaxed text-[var(--ink-soft)]">
          {settings.mode === "off"
            ? "Choose a mode, then start with Balanced."
            : `${activeMode?.name} applies ${activeFrequency} Hz modulation at ${activeDepth}% depth. Lower it if the texture competes with your work.`}
        </p>
      </PopoverContent>
    </Popover>
  )
}

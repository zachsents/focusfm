import {
  IconMediaPause,
  IconMediaPlay,
  IconVolume,
  IconVolumeUp,
} from "nucleo-micro-bold"

import { ElasticSlider } from "#/components/ElasticSlider"
import { Alert, AlertDescription } from "#/components/ui/alert"
import { Button } from "#/components/ui/button"
import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "#/lib/transport"

interface MasterDockProps {
  isPlaying: boolean
  channelCount: number
  masterVolume: number
  bpm: number
  error?: string
  onTogglePlayback: () => void
  onMasterVolumeChange: (volume: number) => void
  onBpmChange: (bpm: number) => void
  onTapTempo: () => void
}

/** Renders the persistent transport and master output control. */
export function MasterDock({
  isPlaying,
  channelCount,
  masterVolume,
  bpm,
  error,
  onTogglePlayback,
  onMasterVolumeChange,
  onBpmChange,
  onTapTempo,
}: MasterDockProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Button
        className="size-[3.25rem] min-h-[3.25rem] rounded-[1rem]"
        variant="skeuomorphic"
        size="icon-lg"
        type="button"
        disabled={!channelCount}
        aria-label={isPlaying ? "Pause mix" : "Play mix"}
        onClick={onTogglePlayback}
      >
        {isPlaying ? (
          <IconMediaPause size={22} />
        ) : (
          <IconMediaPlay className="translate-x-[0.08rem]" size={22} />
        )}
      </Button>
      <div className="flex w-[clamp(10.5rem,18vw,14rem)] min-w-44 items-end gap-2">
        <div className="min-w-0 flex-1">
          <ElasticSlider
            accent="var(--accent)"
            className="[&_[data-slot=elastic-slider-heading]]:text-[var(--ink-soft)] [&_[data-slot=elastic-slider-thumb]]:border-[var(--line-strong)] [&_[data-slot=elastic-slider-track]]:border-[var(--line-strong)] [&_[data-slot=elastic-slider-track]]:bg-[var(--paper-deep)] [&_[data-slot=elastic-slider-value]]:text-[var(--ink)]"
            label="Tempo"
            value={bpm}
            min={MIN_BPM}
            max={MAX_BPM}
            step={1}
            startIcon={null}
            endIcon={null}
            valueLabel={`${bpm} BPM`}
            resetValue={DEFAULT_BPM}
            onChange={onBpmChange}
          />
        </div>
        <Button
          className="mb-[0.02rem] h-[2.1rem] rounded-[0.65rem] px-2 text-[0.65rem] font-black tracking-[0.08em]"
          variant="skeuomorphic"
          size="sm"
          type="button"
          aria-label="Tap tempo"
          onClick={onTapTempo}
        >
          Tap
        </Button>
      </div>
      <div className="w-[clamp(12rem,22vw,18rem)] min-w-48">
        <ElasticSlider
          accent="var(--accent)"
          className="[&_[data-slot=elastic-slider-heading]]:text-[var(--ink-soft)] [&_[data-slot=elastic-slider-icon]]:text-[var(--ink-soft)] [&_[data-slot=elastic-slider-thumb]]:border-[var(--line-strong)] [&_[data-slot=elastic-slider-track]]:border-[var(--line-strong)] [&_[data-slot=elastic-slider-track]]:bg-[var(--paper-deep)] [&_[data-slot=elastic-slider-value]]:text-[var(--ink)]"
          label="Master"
          value={masterVolume}
          min={0}
          max={1}
          step={0.01}
          startIcon={<IconVolume size={16} />}
          endIcon={<IconVolumeUp size={18} />}
          valueLabel={`${Math.round(masterVolume * 100)}%`}
          showLabel={false}
          resetValue={0.72}
          onChange={onMasterVolumeChange}
        />
      </div>
      {error ? (
        <Alert
          className="absolute top-20 right-4 w-[min(28rem,calc(100vw-2rem))] text-[var(--danger)] *:data-[slot=alert-description]:text-inherit"
          variant="destructive"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

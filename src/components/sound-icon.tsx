import {
  IconCircleMusicNoteOutlineDuo18,
  IconCoffeeOutlineDuo18,
  IconCompactDiskOutlineDuo18,
  IconFireFlameOutlineDuo18,
  IconKeyboardOutlineDuo18,
  IconRaindropsOutlineDuo18,
  IconSpeakerOutlineDuo18,
  IconWaterWaveOutlineDuo18,
  IconWaveformLinesOutlineDuo18,
  IconWindowOutlineDuo18,
  type IconProps,
} from "nucleo-ui-outline-duo-18"
import type { ComponentType } from "react"

import type { TrackId } from "#/data/tracks"

const SOUND_ICONS: Record<TrackId, ComponentType<IconProps>> = {
  "brown-noise": IconWaveformLinesOutlineDuo18,
  "pink-noise": IconWaveformLinesOutlineDuo18,
  "white-noise": IconWaveformLinesOutlineDuo18,
  "blue-noise": IconWaveformLinesOutlineDuo18,
  "box-fan": IconWaveformLinesOutlineDuo18,
  "air-conditioner": IconWaveformLinesOutlineDuo18,
  "room-hum": IconWaveformLinesOutlineDuo18,
  "vinyl-texture": IconCompactDiskOutlineDuo18,
  "tape-texture": IconCompactDiskOutlineDuo18,
  "summer-rain": IconRaindropsOutlineDuo18,
  "window-rain": IconRaindropsOutlineDuo18,
  "roof-rain": IconRaindropsOutlineDuo18,
  "slow-waves": IconWaterWaveOutlineDuo18,
  "open-window": IconWindowOutlineDuo18,
  "forest-morning": IconWindowOutlineDuo18,
  "flowing-stream": IconWaterWaveOutlineDuo18,
  "night-insects": IconWindowOutlineDuo18,
  "cafe-murmur": IconCoffeeOutlineDuo18,
  "quiet-library": IconKeyboardOutlineDuo18,
  "quiet-office": IconWindowOutlineDuo18,
  "train-carriage": IconWindowOutlineDuo18,
  "airplane-cabin": IconWindowOutlineDuo18,
  "city-window": IconWindowOutlineDuo18,
  "soft-fire": IconFireFlameOutlineDuo18,
  "distant-thunder": IconRaindropsOutlineDuo18,
  "gull-calls": IconWaterWaveOutlineDuo18,
  "soft-drums": IconCircleMusicNoteOutlineDuo18,
  "brushed-shaker": IconCircleMusicNoteOutlineDuo18,
  "tape-pulse": IconCompactDiskOutlineDuo18,
  "slow-hop-loop": IconCircleMusicNoteOutlineDuo18,
  "downbeat-loop": IconCircleMusicNoteOutlineDuo18,
  "organic-percussion-loop": IconCircleMusicNoteOutlineDuo18,
  "electronic-loop": IconCompactDiskOutlineDuo18,
  "breakbeat-loop": IconCircleMusicNoteOutlineDuo18,
  "minimal-electronic-loop": IconCompactDiskOutlineDuo18,
  "hip-hop-loop": IconCircleMusicNoteOutlineDuo18,
  "kaoss-loop": IconCompactDiskOutlineDuo18,
  "funk-percussion-loop": IconCircleMusicNoteOutlineDuo18,
  "binaural-tone": IconSpeakerOutlineDuo18,
  "soft-drone": IconSpeakerOutlineDuo18,
  "warm-synth": IconSpeakerOutlineDuo18,
  "distant-keys": IconKeyboardOutlineDuo18,
}

interface SoundIconProps {
  trackId: TrackId
  size?: number
  className?: string
}

/** Renders the neutral Nucleo Duotone identity for a sound track. */
export function SoundIcon({ trackId, size = 26, className }: SoundIconProps) {
  const Icon = SOUND_ICONS[trackId]

  return (
    <Icon
      className={className}
      size={size}
      aria-hidden="true"
      focusable="false"
    />
  )
}

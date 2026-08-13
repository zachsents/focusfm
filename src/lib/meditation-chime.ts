export const MEDITATION_CHIME_INTERVALS = [5, 10, 15, 20, 30] as const

export type MeditationChimeInterval =
  (typeof MEDITATION_CHIME_INTERVALS)[number]

export interface MeditationChimeSettings {
  enabled: boolean
  intervalMinutes: MeditationChimeInterval
}

export const DEFAULT_MEDITATION_CHIME: MeditationChimeSettings = {
  enabled: false,
  intervalMinutes: 10,
}

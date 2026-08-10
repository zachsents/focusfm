export const MIN_BPM = 48
export const MAX_BPM = 180
export const DEFAULT_BPM = 76
export const BEATS_PER_BAR = 4

/** Rounds and constrains a tempo to Focus FM's supported musical range. */
export function clampBpm(bpm: number) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))
}

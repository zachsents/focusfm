export interface BinauralTone {
  carrierFrequency: number
  beatFrequency: number
}

export const BINAURAL_TONES: Readonly<Partial<Record<string, BinauralTone>>> = {
  "binaural-tone": { carrierFrequency: 120, beatFrequency: 6 },
  "binaural-calm": { carrierFrequency: 160, beatFrequency: 10 },
  "binaural-focus": { carrierFrequency: 200, beatFrequency: 16 },
  // Retained so a mix saved during the beta rollout remains playable.
  "binaural-deep-focus": { carrierFrequency: 200, beatFrequency: 18 },
}

/** Identifies tracks whose separate left and right signals must be preserved. */
export function isBinauralTrack(trackId: string) {
  return trackId in BINAURAL_TONES
}

/**
 * Fills a stereo buffer with a centered binaural pair and a quiet harmonic.
 * Both partials preserve the requested interaural difference.
 */
export function renderBinauralSamples(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  tone: BinauralTone,
) {
  const leftFrequency = tone.carrierFrequency - tone.beatFrequency / 2
  const rightFrequency = tone.carrierFrequency + tone.beatFrequency / 2
  const leftHarmonic = tone.carrierFrequency * 2 - tone.beatFrequency / 2
  const rightHarmonic = tone.carrierFrequency * 2 + tone.beatFrequency / 2
  const duration = left.length / sampleRate

  left.forEach((_, index) => {
    const time = index / sampleRate
    const breath = 0.92 + 0.04 * Math.sin((Math.PI * 2 * time) / duration)
    left[index] =
      (Math.sin(Math.PI * 2 * leftFrequency * time) * 0.18 +
        Math.sin(Math.PI * 2 * leftHarmonic * time) * 0.025) *
      breath
    right[index] =
      (Math.sin(Math.PI * 2 * rightFrequency * time) * 0.18 +
        Math.sin(Math.PI * 2 * rightHarmonic * time) * 0.025) *
      breath
  })
}

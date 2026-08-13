import { useSyncExternalStore } from "react"
import { z } from "zod"

import { TRACK_IDS } from "#/data/tracks"
import {
  DEFAULT_NEURAL_MODULATION,
  NEURAL_MODULATION_INTENSITIES,
  NEURAL_MODULATION_MODES,
} from "#/lib/neural-modulation"
import { getSharedMixFromLocation, type SharedMix } from "#/lib/share-mix"
import {
  DEFAULT_MEDITATION_CHIME,
  MEDITATION_CHIME_INTERVALS,
} from "#/lib/meditation-chime"
import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from "#/lib/transport"

const channelSchema = z.object({
  id: z.string(),
  trackId: z.enum(TRACK_IDS),
  volume: z.number().min(0).max(1),
  pan: z.number().min(-1).max(1),
  tone: z.number().min(-1).max(1),
  muted: z.boolean(),
  solo: z.boolean().default(false),
})

const presetSchema = z.object({
  id: z.string(),
  name: z.string(),
  channels: z.array(channelSchema),
  masterVolume: z.number().min(0).max(1),
  bpm: z.number().min(MIN_BPM).max(MAX_BPM).default(DEFAULT_BPM),
})

const neuralModulationSchema = z.object({
  mode: z.enum(NEURAL_MODULATION_MODES),
  intensity: z.enum(NEURAL_MODULATION_INTENSITIES),
  stereo: z.boolean().default(false),
  stereoDepth: z.number().min(0).max(1).default(0.45),
})

const meditationChimeSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.union(
    MEDITATION_CHIME_INTERVALS.map((minutes) => z.literal(minutes)),
  ),
})

const mixerSnapshotSchema = z.object({
  version: z.literal(1),
  channels: z.array(channelSchema),
  masterVolume: z.number().min(0).max(1),
  bpm: z.number().min(MIN_BPM).max(MAX_BPM).default(DEFAULT_BPM),
  neuralModulation: neuralModulationSchema.default(DEFAULT_NEURAL_MODULATION),
  meditationChime: meditationChimeSchema.default(DEFAULT_MEDITATION_CHIME),
  presets: z.array(presetSchema),
  activePresetId: z.string().nullable().default(null),
})

export type MixerChannel = z.infer<typeof channelSchema>
export type MixerPreset = z.infer<typeof presetSchema>
export type MixerSnapshot = z.infer<typeof mixerSnapshotSchema>

const STORAGE_KEY = "focusfm:mixer:v1"

const DEFAULT_SNAPSHOT: MixerSnapshot = {
  version: 1,
  masterVolume: 0.72,
  bpm: DEFAULT_BPM,
  neuralModulation: DEFAULT_NEURAL_MODULATION,
  meditationChime: DEFAULT_MEDITATION_CHIME,
  activePresetId: null,
  channels: [
    {
      id: "channel-rain",
      trackId: "summer-rain",
      volume: 0.62,
      pan: -0.12,
      tone: -0.1,
      muted: false,
      solo: false,
    },
    {
      id: "channel-brown",
      trackId: "brown-noise",
      volume: 0.42,
      pan: 0.08,
      tone: -0.28,
      muted: false,
      solo: false,
    },
    {
      id: "channel-synth",
      trackId: "warm-synth",
      volume: 0.24,
      pan: 0,
      tone: -0.14,
      muted: false,
      solo: false,
    },
    {
      id: "channel-waves",
      trackId: "slow-waves",
      volume: 0.34,
      pan: 0.18,
      tone: -0.08,
      muted: false,
      solo: false,
    },
    {
      id: "channel-cafe",
      trackId: "cafe-murmur",
      volume: 0.2,
      pan: -0.18,
      tone: -0.12,
      muted: false,
      solo: false,
    },
    {
      id: "channel-fire",
      trackId: "soft-fire",
      volume: 0.16,
      pan: 0.12,
      tone: -0.22,
      muted: false,
      solo: false,
    },
  ],
  presets: [],
}

// Keep the server render free of placeholder tracks. The client replaces this
// with either the saved mixer or the defaults once local storage is available.
const SERVER_SNAPSHOT: MixerSnapshot = {
  version: 1,
  masterVolume: DEFAULT_SNAPSHOT.masterVolume,
  bpm: DEFAULT_SNAPSHOT.bpm,
  neuralModulation: DEFAULT_NEURAL_MODULATION,
  meditationChime: DEFAULT_MEDITATION_CHIME,
  activePresetId: null,
  channels: [],
  presets: [],
}

let clientSnapshot: MixerSnapshot | undefined
const listeners = new Set<() => void>()
let clientSharedMix: SharedMix | undefined
let hasReadSharedMix = false
const sharedMixListeners = new Set<() => void>()

/** Reads and validates the locally stored mixer state once per page load. */
function getClientSnapshot(): MixerSnapshot {
  if (clientSnapshot) return clientSnapshot
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT

  const localSnapshot = getStoredSnapshot()
  clientSnapshot = localSnapshot
  return clientSnapshot
}

/**
 * Reads and validates a saved mixer snapshot, falling back when storage is
 * invalid.
 */
function getStoredSnapshot() {
  const storedValue = window.localStorage.getItem(STORAGE_KEY)
  if (!storedValue) return DEFAULT_SNAPSHOT

  try {
    const parsedValue = mixerSnapshotSchema.safeParse(JSON.parse(storedValue))
    return parsedValue.success ? parsedValue.data : DEFAULT_SNAPSHOT
  } catch {
    return DEFAULT_SNAPSHOT
  }
}

/** Supplies a deterministic snapshot during server rendering. */
function getServerSnapshot(): MixerSnapshot {
  return SERVER_SNAPSHOT
}

/** Subscribes React to local mixer changes. */
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Reads the shared mix once after hydration so the listener can approve it. */
function getClientSharedMix() {
  if (hasReadSharedMix) return clientSharedMix
  if (typeof window === "undefined") return undefined

  clientSharedMix = getSharedMixFromLocation(window.location)
  hasReadSharedMix = true
  return clientSharedMix
}

/** Keeps shared-link state out of the server render. */
function getServerSharedMix() {
  return undefined
}

/** Subscribes React to dismissal of the pending shared mix. */
function subscribeToSharedMix(listener: () => void) {
  sharedMixListeners.add(listener)
  return () => sharedMixListeners.delete(listener)
}

/** Persists the next snapshot and synchronously informs subscribers. */
export function setMixerSnapshot(nextSnapshot: MixerSnapshot) {
  clientSnapshot = nextSnapshot
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnapshot))
  listeners.forEach((listener) => listener())
}

/** Removes the shared payload once it has been accepted or dismissed. */
export function dismissSharedMix() {
  if (typeof window === "undefined") return

  const url = new URL(window.location.href)
  if (url.pathname.startsWith("/m/") || url.pathname.startsWith("/mix/")) {
    url.pathname = "/"
    url.search = ""
  } else if (url.search.startsWith("?mix-")) {
    url.search = ""
  } else {
    url.searchParams.delete("mix")
  }
  window.history.replaceState(null, "", url)
  clientSharedMix = undefined
  hasReadSharedMix = true
  sharedMixListeners.forEach((listener) => listener())
}

/** Returns the browser-local mixer state as a React external store. */
export function useMixerSnapshot() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

/** Returns the validated shared mix awaiting the listener's approval. */
export function usePendingSharedMix() {
  return useSyncExternalStore(
    subscribeToSharedMix,
    getClientSharedMix,
    getServerSharedMix,
  )
}

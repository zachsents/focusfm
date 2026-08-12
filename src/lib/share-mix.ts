import { z } from "zod"

import { TRACK_IDS, type TrackId } from "#/data/tracks"
import { MAX_BPM, MIN_BPM } from "#/lib/transport"

const SHARE_PARAM = "mix"
const COMPACT_SHARE_PREFIX = `${SHARE_PARAM}-`
const SHARE_PATH_PREFIX = `/${SHARE_PARAM}/`
const SHORT_SHARE_PATH_PREFIX = "/m/"
const BINARY_TOKEN_PREFIX = "2."
const MAX_SHARE_TOKEN_LENGTH = 12_000

const sharedChannelSchema = z.object({
  trackId: z.enum(TRACK_IDS),
  volume: z.number().min(0).max(1),
  pan: z.number().min(-1).max(1),
  tone: z.number().min(-1).max(1),
  muted: z.boolean(),
  solo: z.boolean(),
})

const sharedMixSchema = z
  .object({
    version: z.literal(1),
    channels: z.array(sharedChannelSchema).max(TRACK_IDS.length),
    masterVolume: z.number().min(0).max(1),
    bpm: z.number().min(MIN_BPM).max(MAX_BPM),
  })
  .superRefine((mix, context) => {
    const seenTrackIds = new Set<TrackId>()
    for (const [index, channel] of mix.channels.entries()) {
      if (seenTrackIds.has(channel.trackId)) {
        context.addIssue({
          code: "custom",
          message: "A shared mix cannot include a track more than once.",
          path: ["channels", index, "trackId"],
        })
      }
      seenTrackIds.add(channel.trackId)
    }
  })

export type SharedMix = z.infer<typeof sharedMixSchema>

/** Encodes a mix into a compact, versioned binary token. */
export function encodeSharedMix(mix: SharedMix) {
  const bytes = new Uint8Array(4 + mix.channels.length * 5)
  bytes[0] = 2
  bytes[1] = mix.channels.length
  bytes[2] = Math.round(mix.masterVolume * 100)
  bytes[3] = Math.round(mix.bpm - MIN_BPM)

  mix.channels.forEach((channel, index) => {
    const offset = 4 + index * 5
    bytes[offset] = TRACK_IDS.indexOf(channel.trackId)
    bytes[offset + 1] = Math.round(channel.volume * 100)
    bytes[offset + 2] = Math.round((channel.pan + 1) * 100)
    bytes[offset + 3] = Math.round((channel.tone + 1) * 100)
    bytes[offset + 4] = Number(channel.muted) | (Number(channel.solo) << 1)
  })

  return `${BINARY_TOKEN_PREFIX}${btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")}`
}

/** Decodes the compact binary format used by newly generated links. */
function decodeBinarySharedMix(value: string) {
  const encodedBytes = value.slice(BINARY_TOKEN_PREFIX.length)
  const base64 = encodedBytes
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(encodedBytes.length / 4) * 4, "=")
  const bytes = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  )
  const channelCount = bytes[1]

  if (bytes[0] !== 2 || bytes.length !== 4 + channelCount * 5) {
    return undefined
  }

  return sharedMixSchema.safeParse({
    version: 1,
    channels: Array.from({ length: channelCount }, (_, index) => {
      const offset = 4 + index * 5
      return {
        trackId: TRACK_IDS[bytes[offset]],
        volume: bytes[offset + 1] / 100,
        pan: (bytes[offset + 2] - 100) / 100,
        tone: (bytes[offset + 3] - 100) / 100,
        muted: Boolean(bytes[offset + 4] & 1),
        solo: Boolean(bytes[offset + 4] & 2),
      }
    }),
    masterVolume: bytes[2] / 100,
    bpm: bytes[3] + MIN_BPM,
  })
}

/**
 * Decodes an untrusted shared-mix query parameter into validated mixer
 * settings.
 */
export function decodeSharedMix(value: string | null) {
  if (!value || value.length > MAX_SHARE_TOKEN_LENGTH) return undefined

  try {
    if (value.startsWith(BINARY_TOKEN_PREFIX)) {
      const parsedMix = decodeBinarySharedMix(value)
      return parsedMix?.success ? parsedMix.data : undefined
    }

    const base64 = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=")
    const parsedMix = sharedMixSchema.safeParse(JSON.parse(atob(base64)))
    return parsedMix.success ? parsedMix.data : undefined
  } catch {
    return undefined
  }
}

/** Builds a shareable URL that restores the current audible mixer configuration. */
export function createShareUrl(mix: SharedMix, location: Location) {
  const url = new URL(location.href)
  // Messages strips long query payloads from rich link previews and sends the
  // remainder as plain text. A path segment is treated as part of the URL.
  url.pathname = `${SHORT_SHARE_PATH_PREFIX}${encodeSharedMix(mix)}`
  url.search = ""
  url.hash = ""
  return url.toString()
}

/** Reads the current page's shared mix when one is present. */
export function getSharedMixFromLocation(location: Location) {
  const shortPathValue = location.pathname.startsWith(SHORT_SHARE_PATH_PREFIX)
    ? location.pathname.slice(SHORT_SHARE_PATH_PREFIX.length)
    : null
  const legacyPathValue = location.pathname.startsWith(SHARE_PATH_PREFIX)
    ? location.pathname.slice(SHARE_PATH_PREFIX.length)
    : null
  const compactValue = location.search.startsWith(`?${COMPACT_SHARE_PREFIX}`)
    ? location.search.slice(COMPACT_SHARE_PREFIX.length + 1)
    : null

  // Continue accepting both query formats generated by older releases.
  return decodeSharedMix(
    shortPathValue ??
      legacyPathValue ??
      compactValue ??
      new URLSearchParams(location.search).get(SHARE_PARAM),
  )
}

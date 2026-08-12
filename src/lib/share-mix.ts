import { z } from "zod"

import { TRACK_IDS, type TrackId } from "#/data/tracks"
import { MAX_BPM, MIN_BPM } from "#/lib/transport"

const SHARE_PARAM = "mix"
const COMPACT_SHARE_PREFIX = `${SHARE_PARAM}-`
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

/** Encodes the portable portion of a mix for use in a URL query parameter. */
export function encodeSharedMix(mix: SharedMix) {
  return btoa(JSON.stringify(mix))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

/**
 * Decodes an untrusted shared-mix query parameter into validated mixer
 * settings.
 */
export function decodeSharedMix(value: string | null) {
  if (!value || value.length > MAX_SHARE_TOKEN_LENGTH) return undefined

  try {
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
  // Messages splits a long `?mix=<token>` URL at the equals sign, producing a
  // preview followed by a second message containing the raw token. Keeping the
  // whole payload in one URL-safe query segment prevents that split.
  url.search = `${COMPACT_SHARE_PREFIX}${encodeSharedMix(mix)}`
  return url.toString()
}

/** Reads the current page's shared mix when one is present. */
export function getSharedMixFromLocation(location: Location) {
  const compactValue = location.search.startsWith(`?${COMPACT_SHARE_PREFIX}`)
    ? location.search.slice(COMPACT_SHARE_PREFIX.length + 1)
    : null

  // Continue accepting links generated before the compact URL format shipped.
  return decodeSharedMix(
    compactValue ?? new URLSearchParams(location.search).get(SHARE_PARAM),
  )
}

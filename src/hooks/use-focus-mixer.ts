import { useCallback, useEffect, useRef, useState } from "react"

import type { TrackId } from "#/data/tracks"
import { AudioEngine } from "#/lib/audio-engine"
import {
  dismissSharedMix,
  setMixerSnapshot,
  useMixerSnapshot,
  type MixerChannel,
  type MixerPreset,
  type MixerSnapshot,
} from "#/lib/mixer-store"
import type { SharedMix } from "#/lib/share-mix"
import type { NeuralModulationSettings } from "#/lib/neural-modulation"
import type { MeditationChimeSettings } from "#/lib/meditation-chime"
import { clampBpm } from "#/lib/transport"

/** Writes a complete mixer state to the local external store. */
function updateSnapshot(nextSnapshot: MixerSnapshot) {
  setMixerSnapshot(nextSnapshot)
}

/** Compares the audible settings of a snapshot and preset, ignoring channel IDs. */
function matchesPreset(snapshot: MixerSnapshot, preset: MixerPreset) {
  return (
    snapshot.masterVolume === preset.masterVolume &&
    snapshot.bpm === preset.bpm &&
    snapshot.channels.length === preset.channels.length &&
    snapshot.channels.every((channel, index) => {
      const presetChannel = preset.channels[index]
      return (
        presetChannel.trackId === channel.trackId &&
        presetChannel.volume === channel.volume &&
        presetChannel.pan === channel.pan &&
        presetChannel.tone === channel.tone &&
        presetChannel.muted === channel.muted &&
        presetChannel.solo === channel.solo
      )
    })
  )
}

/** Coordinates persistent mixer state with the transient Web Audio engine. */
export function useFocusMixer() {
  const snapshot = useMixerSnapshot()
  const engineRef = useRef<AudioEngine>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState<string>()
  const previewWasPlayingRef = useRef(false)
  const tempoTapTimesRef = useRef<number[]>([])
  const activePreset = snapshot.presets.find(
    (preset) => preset.id === snapshot.activePresetId,
  )
  const hasPresetChanges = activePreset
    ? !matchesPreset(snapshot, activePreset)
    : false

  const setPlaybackState = useCallback((playing: boolean) => {
    setIsPlaying(playing)
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused"
    }
  }, [])

  const play = useCallback(async () => {
    const engine = (engineRef.current ??= new AudioEngine())
    setAudioError(undefined)

    try {
      await engine.play(
        snapshot.channels,
        snapshot.masterVolume,
        snapshot.bpm,
        snapshot.neuralModulation,
        snapshot.meditationChime,
      )
      setPlaybackState(true)
    } catch {
      setAudioError(
        "Audio could not start. Check this browser’s sound permissions and try again.",
      )
    }
  }, [setPlaybackState, snapshot])

  const pause = useCallback(async () => {
    await engineRef.current?.pause()
    setPlaybackState(false)
  }, [setPlaybackState])

  useEffect(() => {
    if (!("mediaSession" in navigator)) return

    const mediaSession = navigator.mediaSession
    mediaSession.metadata = new MediaMetadata({
      title: "Focus mix",
      artist: "Focus FM",
      album: "Focus FM",
    })
    mediaSession.setActionHandler("play", () => void play())
    mediaSession.setActionHandler("pause", () => void pause())

    return () => {
      mediaSession.setActionHandler("play", null)
      mediaSession.setActionHandler("pause", null)
      mediaSession.playbackState = "none"
    }
  }, [pause, play])

  const togglePlayback = async () => {
    if (isPlaying) await pause()
    else await play()
  }

  const preparePreview = async () => {
    const engine = (engineRef.current ??= new AudioEngine())
    previewWasPlayingRef.current = isPlaying
    setAudioError(undefined)

    try {
      await engine.preparePreview()
    } catch {
      setAudioError("That sound could not be previewed.")
    }
  }

  const startPreview = async (trackId: TrackId) => {
    const engine = (engineRef.current ??= new AudioEngine())
    previewWasPlayingRef.current = isPlaying
    setAudioError(undefined)

    try {
      await engine.startPreview(trackId, snapshot.masterVolume)
    } catch {
      setAudioError("That sound could not be previewed.")
    }
  }

  const stopPreview = async () => {
    await engineRef.current?.stopPreview(previewWasPlayingRef.current)
  }

  const addTrack = (trackId: TrackId) => {
    if (snapshot.channels.some((channel) => channel.trackId === trackId)) return
    const channel: MixerChannel = {
      id: `${trackId}-${crypto.randomUUID()}`,
      trackId,
      volume: 0.5,
      pan: 0,
      tone: 0,
      muted: false,
      solo: false,
    }
    const nextSnapshot = {
      ...snapshot,
      channels: [...snapshot.channels, channel],
    }
    updateSnapshot(nextSnapshot)
    if (isPlaying) void engineRef.current?.syncChannels(nextSnapshot.channels)
  }

  const updateChannel = (nextChannel: MixerChannel) => {
    const channels = snapshot.channels.map((channel) => {
      if (channel.id === nextChannel.id) return nextChannel
      return nextChannel.solo && channel.solo
        ? { ...channel, solo: false }
        : channel
    })
    updateSnapshot({ ...snapshot, channels })
    if (!isPlaying) return

    const previousChannel = snapshot.channels.find(
      (channel) => channel.id === nextChannel.id,
    )
    if (previousChannel?.solo !== nextChannel.solo) {
      void engineRef.current?.syncChannels(channels)
      return
    }

    const hasSoloChannel = channels.some((channel) => channel.solo)
    void engineRef.current?.updateChannel({
      ...nextChannel,
      muted: nextChannel.muted || (hasSoloChannel && !nextChannel.solo),
    })
  }

  const removeChannel = (channelId: string) => {
    const channels = snapshot.channels.filter(
      (channel) => channel.id !== channelId,
    )
    updateSnapshot({ ...snapshot, channels })
    if (isPlaying) void engineRef.current?.syncChannels(channels)
    else engineRef.current?.removeChannel(channelId)
  }

  const setMasterVolume = (masterVolume: number) => {
    updateSnapshot({ ...snapshot, masterVolume })
    if (isPlaying) engineRef.current?.setMasterVolume(masterVolume)
  }

  const setBpm = (bpm: number) => {
    const nextBpm = clampBpm(bpm)
    updateSnapshot({ ...snapshot, bpm: nextBpm })
    if (isPlaying) engineRef.current?.setBpm(nextBpm)
  }

  const setNeuralModulation = (neuralModulation: NeuralModulationSettings) => {
    updateSnapshot({ ...snapshot, neuralModulation })
    if (isPlaying) engineRef.current?.setNeuralModulation(neuralModulation)
  }

  const setMeditationChime = (meditationChime: MeditationChimeSettings) => {
    updateSnapshot({ ...snapshot, meditationChime })
    if (isPlaying) engineRef.current?.setMeditationChime(meditationChime)
  }

  const previewMeditationChime = () => {
    const engine = (engineRef.current ??= new AudioEngine())
    engine.previewMeditationChime()
  }

  const tapTempo = () => {
    const now = performance.now()
    const previousTap = tempoTapTimesRef.current.at(-1)
    const recentTaps =
      previousTap && now - previousTap <= 2_000
        ? [...tempoTapTimesRef.current, now].slice(-5)
        : [now]
    tempoTapTimesRef.current = recentTaps
    if (recentTaps.length < 2) return

    const intervals = recentTaps.slice(1).map((tap, index) => {
      return tap - recentTaps[index]
    })
    const averageInterval =
      intervals.reduce((total, interval) => total + interval, 0) /
      intervals.length
    setBpm(60_000 / averageInterval)
  }

  const savePreset = (name: string) => {
    const preset: MixerPreset = {
      id: crypto.randomUUID(),
      name,
      channels: snapshot.channels.map((channel) => ({ ...channel })),
      masterVolume: snapshot.masterVolume,
      bpm: snapshot.bpm,
    }
    updateSnapshot({
      ...snapshot,
      presets: [...snapshot.presets, preset],
      activePresetId: preset.id,
    })
  }

  const applyPreset = (preset: MixerPreset) => {
    const channels = preset.channels.map((channel) => ({
      ...channel,
      id: `${channel.trackId}-${crypto.randomUUID()}`,
    }))
    updateSnapshot({
      ...snapshot,
      channels,
      masterVolume: preset.masterVolume,
      bpm: preset.bpm,
      activePresetId: preset.id,
    })
    if (isPlaying) {
      void engineRef.current?.syncChannels(channels)
      engineRef.current?.setMasterVolume(preset.masterVolume)
      engineRef.current?.setBpm(preset.bpm)
    }
  }

  const savePresetChanges = () => {
    if (!activePreset) return
    const updatedPreset: MixerPreset = {
      ...activePreset,
      channels: snapshot.channels.map((channel) => ({ ...channel })),
      masterVolume: snapshot.masterVolume,
      bpm: snapshot.bpm,
    }
    updateSnapshot({
      ...snapshot,
      presets: snapshot.presets.map((preset) =>
        preset.id === updatedPreset.id ? updatedPreset : preset,
      ),
    })
  }

  const discardPresetChanges = () => {
    if (activePreset) applyPreset(activePreset)
  }

  const deletePreset = (presetId: string) => {
    updateSnapshot({
      ...snapshot,
      presets: snapshot.presets.filter((preset) => preset.id !== presetId),
      activePresetId:
        snapshot.activePresetId === presetId ? null : snapshot.activePresetId,
    })
  }

  const applySharedMix = (sharedMix: SharedMix) => {
    const channels = sharedMix.channels.map((channel, index) => ({
      ...channel,
      id: `shared-${channel.trackId}-${index}`,
    }))
    updateSnapshot({
      ...snapshot,
      channels,
      masterVolume: sharedMix.masterVolume,
      bpm: sharedMix.bpm,
      activePresetId: null,
    })
    dismissSharedMix()
    if (isPlaying) {
      void engineRef.current?.syncChannels(channels)
      engineRef.current?.setMasterVolume(sharedMix.masterVolume)
      engineRef.current?.setBpm(sharedMix.bpm)
    }
  }

  return {
    ...snapshot,
    isPlaying,
    audioError,
    activePreset,
    hasPresetChanges,
    togglePlayback,
    preparePreview,
    startPreview,
    stopPreview,
    addTrack,
    updateChannel,
    removeChannel,
    setMasterVolume,
    setBpm,
    setNeuralModulation,
    setMeditationChime,
    previewMeditationChime,
    tapTempo,
    savePreset,
    loadPreset: applyPreset,
    savePresetChanges,
    discardPresetChanges,
    deletePreset,
    applySharedMix,
  }
}

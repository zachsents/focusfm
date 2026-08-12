import soundTouchProcessorUrl from "@soundtouchjs/audio-worklet/processor?url"

import { TRACKS_BY_ID, type TrackId } from "#/data/tracks"
import {
  BINAURAL_TONES,
  isBinauralTrack,
  renderBinauralSamples,
  type BinauralTone,
} from "#/lib/binaural"
import type { MixerChannel } from "#/lib/mixer-store"
import {
  NEURAL_MODULATION_DEPTHS,
  NEURAL_MODULATION_FREQUENCIES,
  type NeuralModulationSettings,
} from "#/lib/neural-modulation"
import { BEATS_PER_BAR, clampBpm, DEFAULT_BPM } from "#/lib/transport"

type SoundTouchNode = import("@soundtouchjs/audio-worklet").SoundTouchNode
type SoundTouchConstructor =
  typeof import("@soundtouchjs/audio-worklet").SoundTouchNode

interface ManagedChannel {
  source: AudioBufferSourceNode
  timeStretch?: SoundTouchNode
  nativeBpm?: number
  lowShelf: BiquadFilterNode
  highShelf: BiquadFilterNode
  panner: StereoPannerNode
  gain: GainNode
}

interface NoiseState {
  brown: number
  pink0: number
  pink1: number
  pink2: number
  previousWhite: number
}

const TRACK_LEVELS: Record<TrackId, number> = {
  "brown-noise": 0.35,
  "pink-noise": 0.23,
  "white-noise": 0.15,
  "blue-noise": 0.11,
  "box-fan": 0.22,
  "air-conditioner": 0.25,
  "room-hum": 0.24,
  "vinyl-texture": 0.18,
  "tape-texture": 0.16,
  "summer-rain": 0.2,
  "window-rain": 0.22,
  "roof-rain": 0.2,
  "slow-waves": 0.4,
  "open-window": 0.25,
  "forest-morning": 0.24,
  "flowing-stream": 0.2,
  "night-insects": 0.2,
  "cafe-murmur": 0.26,
  "quiet-library": 0.2,
  "quiet-office": 0.22,
  "train-carriage": 0.24,
  "airplane-cabin": 0.22,
  "city-window": 0.23,
  "soft-fire": 0.42,
  "distant-thunder": 0.4,
  "gull-calls": 0.26,
  "soft-drums": 0.55,
  "acid-techno-kick": 0.62,
  "brushed-shaker": 0.34,
  "tape-pulse": 0.46,
  "slow-hop-loop": 0.58,
  "downbeat-loop": 0.58,
  "organic-percussion-loop": 0.52,
  "electronic-loop": 0.55,
  "breakbeat-loop": 0.56,
  "minimal-electronic-loop": 0.5,
  "hip-hop-loop": 0.52,
  "kaoss-loop": 0.5,
  "funk-percussion-loop": 0.48,
  "binaural-tone": 0.2,
  "binaural-calm": 0.2,
  "binaural-focus": 0.2,
  "binaural-deep-focus": 0.2,
  "soft-drone": 0.24,
  "warm-synth": 0.34,
  "acid-synth": 0.2,
  "distant-keys": 0.42,
}

const RECORDED_TRACK_URLS: Partial<Record<TrackId, string>> = {
  "summer-rain": "/audio/summer-rain.mp3",
  "window-rain": "/audio/window-rain.mp3",
  "roof-rain": "/audio/roof-rain.mp3",
  "slow-waves": "/audio/slow-waves.mp3",
  "open-window": "/audio/open-window.mp3",
  "forest-morning": "/audio/forest-morning.mp3",
  "flowing-stream": "/audio/flowing-stream.mp3",
  "night-insects": "/audio/night-insects.mp3",
  "cafe-murmur": "/audio/cafe-murmur.mp3",
  "quiet-library": "/audio/quiet-library.mp3",
  "quiet-office": "/audio/quiet-office.mp3",
  "train-carriage": "/audio/train-carriage.mp3",
  "airplane-cabin": "/audio/airplane-cabin.mp3",
  "city-window": "/audio/city-window.mp3",
  "soft-fire": "/audio/soft-fire.mp3",
  "distant-thunder": "/audio/distant-thunder.mp3?v=2",
  "gull-calls": "/audio/gull-calls.mp3?v=2",
  "slow-hop-loop": "/audio/drum-loops/77-bpm.wav",
  "downbeat-loop": "/audio/drum-loops/downbeat-86.wav",
  "organic-percussion-loop": "/audio/drum-loops/percussion-95.wav",
  "electronic-loop": "/audio/drum-loops/electronic-96.wav",
  "breakbeat-loop": "/audio/drum-loops/breakbeat-106.wav",
  "minimal-electronic-loop": "/audio/drum-loops/electronic-111.wav",
  "hip-hop-loop": "/audio/drum-loops/hip-hop-120.wav",
  "kaoss-loop": "/audio/drum-loops/kaoss-124.wav",
  "funk-percussion-loop": "/audio/drum-loops/percussion-135.wav",
}

const bufferCache = new Map<TrackId, Promise<AudioBuffer>>()
const PREVIEW_VOLUME = 0.7
const ACID_SYNTH_SEMITONES = [
  0, 0, 12, 3, 0, 7, 10, 3, 0, 12, 7, 15, 0, 10, 7, 3,
] as const
const ACID_SYNTH_ACCENTS = new Set([0, 5, 8, 11, 13])
const ACID_SYNTH_SLIDES = new Set([2, 7, 10, 14])
const ACID_SYNTH_RESTS = new Set([6, 15])

/** Runs the mixer's recorded and procedural Web Audio graph. */
export class AudioEngine {
  private context: AudioContext | undefined
  private masterGain: GainNode | undefined
  private mixBus: GainNode | undefined
  private modulationGain: GainNode | undefined
  private modulationDepth: GainNode | undefined
  private modulationOscillator: OscillatorNode | undefined
  private stereoModulationDepth: GainNode | undefined
  private channels = new Map<string, ManagedChannel>()
  private pendingChannels = new Map<
    string,
    Promise<ManagedChannel | undefined>
  >()
  private activeChannelIds = new Set<string>()
  private bpm = DEFAULT_BPM
  private transportAnchorTime = 0
  private transportAnchorBeat = 0
  private soundTouchConstructor: Promise<SoundTouchConstructor> | undefined
  private previewContext: AudioContext | undefined
  private previewGain: GainNode | undefined
  private previewSource: AudioBufferSourceNode | undefined
  private previewRequest = 0

  /** Creates the audio graph on the first user gesture. */
  private ensureContext() {
    if (this.context && this.masterGain && this.mixBus) {
      return {
        context: this.context,
        masterGain: this.masterGain,
        mixBus: this.mixBus,
      }
    }

    const context = new AudioContext({ latencyHint: "playback" })
    const masterGain = context.createGain()
    const mixBus = context.createGain()
    const modulationGain = context.createGain()
    modulationGain.gain.value = 1
    const modulationDepth = context.createGain()
    modulationDepth.gain.value = 0
    const stereoModulationDepth = context.createGain()
    stereoModulationDepth.gain.value = 0
    const stereoModulationPanner = context.createStereoPanner()
    const modulationOscillator = context.createOscillator()
    modulationOscillator.type = "sine"
    modulationOscillator.frequency.value = 10
    modulationOscillator.connect(modulationDepth).connect(modulationGain.gain)
    modulationOscillator
      .connect(stereoModulationDepth)
      .connect(stereoModulationPanner.pan)
    modulationOscillator.start()

    mixBus
      .connect(modulationGain)
      .connect(stereoModulationPanner)
      .connect(masterGain)
      .connect(context.destination)
    this.context = context
    this.masterGain = masterGain
    this.mixBus = mixBus
    this.modulationGain = modulationGain
    this.modulationDepth = modulationDepth
    this.modulationOscillator = modulationOscillator
    this.stereoModulationDepth = stereoModulationDepth
    return { context, masterGain, mixBus }
  }

  /** Creates a separate output graph so previews never disturb mixer nodes. */
  private ensurePreviewContext() {
    if (this.previewContext && this.previewGain) {
      return { context: this.previewContext, gain: this.previewGain }
    }

    const context = new AudioContext({ latencyHint: "interactive" })
    const gain = context.createGain()
    gain.connect(context.destination)
    this.previewContext = context
    this.previewGain = gain
    return { context, gain }
  }

  /** Starts or resumes audio and synchronizes all visible channels. */
  async play(
    channels: readonly MixerChannel[],
    masterVolume: number,
    bpm: number,
    neuralModulation: NeuralModulationSettings,
  ) {
    const { context } = this.ensureContext()
    this.setBpm(bpm)
    if (this.channels.size === 0 && this.pendingChannels.size === 0) {
      this.transportAnchorTime = context.currentTime + 0.12
      this.transportAnchorBeat = 0
    }
    this.setMasterVolume(masterVolume)
    this.setNeuralModulation(neuralModulation)
    await this.syncChannels(channels)
    await context.resume()
  }

  /** Pauses audio without throwing away the generated graph. */
  async pause() {
    await this.context?.suspend()
  }

  /** Unlocks the isolated preview context during the initial pointer gesture. */
  async preparePreview() {
    const { context } = this.ensurePreviewContext()
    await context.resume()
  }

  /** Pauses the current mix and starts one isolated library preview. */
  async startPreview(trackId: TrackId, masterVolume: number) {
    const { context, gain } = this.ensurePreviewContext()
    const request = ++this.previewRequest
    const buffer = await getTrackBuffer(context, trackId)
    if (request !== this.previewRequest) return

    await this.context?.suspend()
    if (request !== this.previewRequest) return
    this.previewSource?.stop()
    this.previewSource?.disconnect()

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(gain)
    gain.gain.setValueAtTime(masterVolume * PREVIEW_VOLUME, context.currentTime)
    source.start(0, Math.random() * buffer.duration)
    this.previewSource = source
  }

  /** Stops a library preview and restores the mix's previous transport state. */
  async stopPreview(resumeMix: boolean) {
    ++this.previewRequest
    this.previewSource?.stop()
    this.previewSource?.disconnect()
    this.previewSource = undefined
    await this.previewContext?.suspend()
    if (resumeMix) await this.context?.resume()
  }

  /** Adds, updates, and removes graph nodes to match the mixer state. */
  async syncChannels(channels: readonly MixerChannel[]) {
    const nextIds = new Set(channels.map((channel) => channel.id))
    this.channels.forEach((_, channelId) => {
      if (!nextIds.has(channelId)) this.removeChannel(channelId)
    })
    this.activeChannelIds = nextIds
    const hasSoloChannel = channels.some((channel) => channel.solo)
    await Promise.all(
      channels.map((channel) =>
        this.updateChannel({
          ...channel,
          muted: channel.muted || (hasSoloChannel && !channel.solo),
        }),
      ),
    )
  }

  /** Applies one channel state to its Web Audio nodes. */
  async updateChannel(channel: MixerChannel) {
    const { context, masterGain, mixBus } = this.ensureContext()
    this.activeChannelIds.add(channel.id)
    const outputBus = isNeuralModulationEligible(channel.trackId)
      ? mixBus
      : masterGain
    const managedChannel = await this.getOrCreateChannel(
      context,
      outputBus,
      channel,
    )
    if (!managedChannel) return

    const now = context.currentTime
    const gain = channel.muted ? 0 : channel.volume
    managedChannel.gain.gain.setTargetAtTime(gain, now, 0.025)
    managedChannel.panner.pan.setTargetAtTime(
      isBinauralTrack(channel.trackId) ? 0 : channel.pan,
      now,
      0.03,
    )
    const tone =
      channel.tone + (channel.trackId === "acid-techno-kick" ? -1 : 0)
    managedChannel.lowShelf.gain.setTargetAtTime(-tone * 9, now, 0.04)
    managedChannel.highShelf.gain.setTargetAtTime(tone * 9, now, 0.04)
  }

  /** Sets the output level with a short de-clicking ramp. */
  setMasterVolume(volume: number) {
    const { context, masterGain } = this.ensureContext()
    masterGain.gain.setTargetAtTime(volume, context.currentTime, 0.03)
  }

  /** Applies subtle sine-wave amplitude modulation to the musical output bus. */
  setNeuralModulation(settings: NeuralModulationSettings) {
    const { context } = this.ensureContext()
    const frequency = NEURAL_MODULATION_FREQUENCIES[settings.mode]
    const depth =
      settings.mode === "off" ? 0 : NEURAL_MODULATION_DEPTHS[settings.intensity]
    const stereoDepth =
      settings.mode === "off" || !settings.stereo ? 0 : settings.stereoDepth
    const now = context.currentTime

    this.modulationOscillator?.frequency.setTargetAtTime(
      frequency || 10,
      now,
      0.04,
    )
    this.modulationGain?.gain.setTargetAtTime(1 - depth / 2, now, 0.04)
    this.modulationDepth?.gain.setTargetAtTime(depth / 2, now, 0.04)
    this.stereoModulationDepth?.gain.setTargetAtTime(stereoDepth, now, 0.04)
  }

  /** Changes every rhythmic channel's tempo while preserving pitch and phase. */
  setBpm(bpm: number) {
    const nextBpm = clampBpm(bpm)
    const context = this.context
    if (context) {
      const now = context.currentTime
      this.transportAnchorBeat = this.getTransportBeat(now)
      this.transportAnchorTime = now
    }
    this.bpm = nextBpm

    this.channels.forEach((channel) => {
      if (!channel.nativeBpm || !channel.timeStretch || !context) return
      const playbackRate = nextBpm / channel.nativeBpm
      channel.source.playbackRate.setValueAtTime(
        playbackRate,
        context.currentTime,
      )
      channel.timeStretch.playbackRate.setValueAtTime(
        playbackRate,
        context.currentTime,
      )
    })
  }

  /** Stops and detaches a single channel. */
  removeChannel(channelId: string) {
    this.activeChannelIds.delete(channelId)
    const channel = this.channels.get(channelId)
    if (!channel) return
    channel.source.stop()
    channel.source.disconnect()
    channel.timeStretch?.disconnect()
    channel.gain.disconnect()
    this.channels.delete(channelId)
  }

  /** Reuses an in-flight channel build when controls change during loading. */
  private async getOrCreateChannel(
    context: AudioContext,
    outputBus: GainNode,
    channel: MixerChannel,
  ) {
    const existingChannel = this.channels.get(channel.id)
    if (existingChannel) return existingChannel

    const pendingChannel =
      this.pendingChannels.get(channel.id) ??
      this.createChannel(context, outputBus, channel)
    this.pendingChannels.set(channel.id, pendingChannel)

    try {
      return await pendingChannel
    } finally {
      this.pendingChannels.delete(channel.id)
    }
  }

  /** Builds a complete source-to-master signal chain. */
  private async createChannel(
    context: AudioContext,
    outputBus: GainNode,
    channel: MixerChannel,
  ) {
    const nativeBpm = TRACKS_BY_ID.get(channel.trackId)?.nativeBpm
    const [buffer, SoundTouch] = await Promise.all([
      getTrackBuffer(context, channel.trackId),
      nativeBpm ? this.getSoundTouchConstructor(context) : undefined,
    ])
    if (!this.activeChannelIds.has(channel.id)) return undefined

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const lowShelf = context.createBiquadFilter()
    lowShelf.type = "lowshelf"
    lowShelf.frequency.value = 280
    const highShelf = context.createBiquadFilter()
    highShelf.type = "highshelf"
    highShelf.frequency.value = 2600
    const panner = context.createStereoPanner()
    const gain = context.createGain()
    gain.gain.value = 0

    let timeStretch: SoundTouchNode | undefined
    if (nativeBpm && SoundTouch) {
      const playbackRate = this.bpm / nativeBpm
      timeStretch = new SoundTouch({ context })
      timeStretch.pitch.value = 1
      timeStretch.playbackRate.value = playbackRate
      timeStretch.setStretchParameters({ overlapMs: 12, quickSeek: false })
      source.playbackRate.value = playbackRate
      source.connect(timeStretch).connect(lowShelf)
    } else {
      source.connect(lowShelf)
    }
    lowShelf.connect(highShelf).connect(panner).connect(gain)
    gain.connect(outputBus)
    source.start(
      nativeBpm ? this.getNextBarTime(context) : 0,
      nativeBpm ? 0 : Math.random() * source.buffer.duration,
    )

    const managedChannel = {
      source,
      timeStretch,
      nativeBpm,
      lowShelf,
      highShelf,
      panner,
      gain,
    }
    this.channels.set(channel.id, managedChannel)
    return managedChannel
  }

  /** Loads and registers the worklet only if the mix contains a rhythmic track. */
  private getSoundTouchConstructor(context: AudioContext) {
    this.soundTouchConstructor ??= import("@soundtouchjs/audio-worklet").then(
      async ({ SoundTouchNode }) => {
        await SoundTouchNode.register(context, soundTouchProcessorUrl)
        return SoundTouchNode
      },
    )
    return this.soundTouchConstructor
  }

  /** Returns the continuous global beat position at an AudioContext time. */
  private getTransportBeat(time: number) {
    if (time <= this.transportAnchorTime) return this.transportAnchorBeat
    return (
      this.transportAnchorBeat +
      ((time - this.transportAnchorTime) * this.bpm) / 60
    )
  }

  /** Quantizes newly added rhythmic sources to the next shared bar. */
  private getNextBarTime(context: AudioContext) {
    const now = context.currentTime
    if (now < this.transportAnchorTime) return this.transportAnchorTime

    const currentBeat = this.getTransportBeat(now)
    const nextBarBeat =
      (Math.floor(currentBeat / BEATS_PER_BAR) + 1) * BEATS_PER_BAR
    return now + ((nextBarBeat - currentBeat) * 60) / this.bpm
  }
}

/**
 * Limits modulation to musical layers without altering ambience or binaural
 * cues.
 */
function isNeuralModulationEligible(trackId: TrackId) {
  const category = TRACKS_BY_ID.get(trackId)?.category
  return (
    category === "rhythm" || (category === "tone" && !isBinauralTrack(trackId))
  )
}

/** Returns a lazily loaded or rendered loop buffer for a library track. */
function getTrackBuffer(context: AudioContext, trackId: TrackId) {
  const cachedBuffer = bufferCache.get(trackId)
  if (cachedBuffer) return cachedBuffer

  const recordedTrackUrl = RECORDED_TRACK_URLS[trackId]
  const buffer = recordedTrackUrl
    ? loadRecordedBuffer(context, recordedTrackUrl, trackId)
    : Promise.resolve(renderTrackBuffer(context, trackId))
  bufferCache.set(trackId, buffer)
  return buffer
}

/** Fetches a field recording, falling back to synthesis when unavailable. */
async function loadRecordedBuffer(
  context: AudioContext,
  url: string,
  trackId: TrackId,
) {
  try {
    const response = await fetch(url)
    if (!response.ok)
      throw new Error(`Audio request failed: ${response.status}`)
    return await context.decodeAudioData(await response.arrayBuffer())
  } catch {
    return renderTrackBuffer(context, trackId)
  }
}

/** Renders a procedural loop for generated tracks and offline fallbacks. */
function renderTrackBuffer(context: AudioContext, trackId: TrackId) {
  const binauralTone = BINAURAL_TONES[trackId]
  if (binauralTone) {
    return renderBinauralBuffer(context, binauralTone)
  }

  const nativeBpm = TRACKS_BY_ID.get(trackId)?.nativeBpm
  const duration = nativeBpm ? (60 / nativeBpm) * 16 : 16
  const sampleRate = context.sampleRate
  const buffer = context.createBuffer(
    1,
    Math.floor(duration * sampleRate),
    sampleRate,
  )
  const samples = buffer.getChannelData(0)
  renderTrack(samples, sampleRate, trackId)
  return buffer
}

/** Renders one repeatable procedural soundscape into a sample buffer. */
function renderTrack(
  samples: Float32Array,
  sampleRate: number,
  trackId: TrackId,
) {
  if (trackId === "acid-techno-kick") {
    renderAcidTechnoKickSamples(samples, sampleRate)
    return
  }
  if (trackId === "acid-synth") {
    renderAcidSynthSamples(samples, sampleRate)
    return
  }

  const random = createRandom(hashString(trackId))
  const state: NoiseState = {
    brown: 0,
    pink0: 0,
    pink1: 0,
    pink2: 0,
    previousWhite: 0,
  }
  const level = TRACK_LEVELS[trackId]

  samples.forEach((_, index) => {
    const time = index / sampleRate
    const white = random() * 2 - 1
    const noise = getNoiseSample(white, state)
    samples[index] = level * getTrackSample(trackId, time, white, noise, random)
  })
}

/** Produces brown and pink variants from a white-noise input. */
function getNoiseSample(white: number, state: NoiseState) {
  const blue = (white - state.previousWhite) * 0.62
  state.previousWhite = white
  state.brown = (state.brown + white * 0.018) / 1.018
  state.pink0 = 0.99765 * state.pink0 + white * 0.099_046
  state.pink1 = 0.963 * state.pink1 + white * 0.296_516_4
  state.pink2 = 0.57 * state.pink2 + white * 1.052_691_3
  return {
    blue,
    brown: state.brown * 3.5,
    pink: (state.pink0 + state.pink1 + state.pink2 + white * 0.1848) * 0.18,
  }
}

/** Selects the synthesis recipe for a procedural library track. */
function getTrackSample(
  trackId: TrackId,
  time: number,
  white: number,
  noise: { blue: number; brown: number; pink: number },
  random: () => number,
) {
  const slowWave = 0.5 + 0.5 * Math.sin((Math.PI * 2 * time) / 7)
  const breeze = 0.55 + 0.25 * Math.sin((Math.PI * 2 * time) / 5.3)

  switch (trackId) {
    case "brown-noise":
      return noise.brown
    case "pink-noise":
      return noise.pink
    case "white-noise":
      return white
    case "blue-noise":
      return noise.blue
    case "box-fan":
      return renderBoxFanSample(time, noise.pink)
    case "air-conditioner":
      return renderAirConditionerSample(time, noise.brown, noise.pink)
    case "room-hum":
      return renderRoomHumSample(time, noise.pink)
    case "vinyl-texture":
      return renderVinylSample(time, noise.pink, random)
    case "tape-texture":
      return renderTapeTextureSample(time, white, noise.pink)
    case "summer-rain":
      return white * 0.72 + noise.pink * 0.28
    case "window-rain":
      return white * 0.55 + noise.pink * 0.4
    case "roof-rain":
      return white * 0.38 + noise.pink * 0.62
    case "slow-waves":
      return noise.brown * (0.18 + slowWave * 0.82) + noise.pink * 0.08
    case "open-window":
      return noise.pink * breeze + noise.brown * 0.24
    case "forest-morning":
      return noise.pink * breeze * 0.7 + noise.brown * 0.18
    case "flowing-stream":
      return white * 0.25 + noise.pink * 0.72
    case "night-insects":
      return renderNightInsectsFallback(time, noise.pink)
    case "cafe-murmur":
      return noise.pink * (0.68 + 0.16 * Math.sin(time * 1.7))
    case "quiet-library":
      return noise.pink * 0.35 + noise.brown * 0.18
    case "quiet-office":
      return renderRoomHumSample(time, noise.pink) * 0.75
    case "train-carriage":
      return noise.brown * 0.7 + noise.pink * 0.28
    case "airplane-cabin":
      return noise.pink * 0.68 + noise.brown * 0.42
    case "city-window":
      return noise.brown * 0.52 + noise.pink * 0.24
    case "soft-fire": {
      const crackle = random() > 0.9985 ? (random() * 2 - 1) * 2.2 : 0
      return noise.brown * 0.72 + crackle
    }
    case "distant-thunder":
      return renderThunderFallback(time, noise.brown)
    case "gull-calls":
      return renderGullFallback(time)
    case "soft-drums":
      return renderDrumSample(time, white)
    case "acid-techno-kick":
      return 0 // Rendered statefully before the generic per-sample path.
    case "brushed-shaker":
      return renderShakerSample(time, white)
    case "tape-pulse":
      return renderPulseSample(time, noise.pink)
    case "slow-hop-loop":
    case "downbeat-loop":
    case "organic-percussion-loop":
    case "electronic-loop":
    case "breakbeat-loop":
    case "minimal-electronic-loop":
    case "hip-hop-loop":
    case "kaoss-loop":
    case "funk-percussion-loop":
      return renderDrumSample(
        time,
        white,
        TRACKS_BY_ID.get(trackId)?.nativeBpm ?? DEFAULT_BPM,
      )
    case "binaural-tone":
    case "binaural-calm":
    case "binaural-focus":
    case "binaural-deep-focus":
      return 0
    case "soft-drone":
      return renderDroneSample(time)
    case "warm-synth":
      return renderSynthSample(time)
    case "acid-synth":
      return 0 // Rendered statefully before the generic per-sample path.
    case "distant-keys":
      return renderKeysSample(time)
  }
}

/** Synthesizes a rotating fan bed with subdued motor harmonics. */
function renderBoxFanSample(time: number, pink: number) {
  const blade = 0.72 + 0.1 * Math.sin(Math.PI * 2 * 0.8 * time)
  const motor =
    Math.sin(Math.PI * 2 * 59.5 * time) * 0.16 +
    Math.sin(Math.PI * 2 * 119 * time) * 0.06
  return pink * blade + motor
}

/** Synthesizes broad HVAC air with a slow compressor cycle. */
function renderAirConditionerSample(time: number, brown: number, pink: number) {
  const compressor = 0.76 + 0.12 * Math.sin((Math.PI * 2 * time) / 12)
  const motor = Math.sin(Math.PI * 2 * 48 * time) * 0.14
  return (pink * 0.68 + brown * 0.28 + motor) * compressor
}

/** Synthesizes a low electrical room tone. */
function renderRoomHumSample(time: number, pink: number) {
  return (
    Math.sin(Math.PI * 2 * 60 * time) * 0.64 +
    Math.sin(Math.PI * 2 * 120 * time) * 0.18 +
    Math.sin(Math.PI * 2 * 180 * time) * 0.06 +
    pink * 0.08
  )
}

/** Synthesizes a vinyl surface bed with occasional tiny impulses. */
function renderVinylSample(time: number, pink: number, random: () => number) {
  const rotation = 0.88 + 0.08 * Math.sin(Math.PI * 2 * 0.55 * time)
  const click = random() > 0.9997 ? (random() * 2 - 1) * 2.4 : 0
  return pink * 0.42 * rotation + click
}

/** Synthesizes tape hiss with gentle wow and low-frequency head noise. */
function renderTapeTextureSample(time: number, white: number, pink: number) {
  const wow = 0.9 + 0.07 * Math.sin(Math.PI * 2 * 0.42 * time)
  const head = Math.sin(Math.PI * 2 * 52 * time) * 0.05
  return (white * 0.36 + pink * 0.38) * wow + head
}

/** Provides a tonal fallback for the recorded insect bed. */
function renderNightInsectsFallback(time: number, pink: number) {
  const chirpPhase = time % 0.72
  const chirp =
    chirpPhase < 0.11
      ? Math.sin(Math.PI * 2 * 4_200 * time) *
        Math.sin((Math.PI * chirpPhase) / 0.11)
      : 0
  return pink * 0.12 + chirp * 0.38
}

/** Provides a sparse low rumble when the thunder recording is unavailable. */
function renderThunderFallback(time: number, brown: number) {
  const phase = time % 16
  if (phase < 9 || phase > 14) return 0
  const envelope = Math.sin((Math.PI * (phase - 9)) / 5) ** 2
  return brown * envelope
}

/** Provides a simple sparse call when the gull recording is unavailable. */
function renderGullFallback(time: number) {
  const phase = time % 11
  if (phase > 0.85) return 0
  const sweep = 780 + phase * 440
  return (
    Math.sin(Math.PI * 2 * sweep * time) *
    Math.sin((Math.PI * phase) / 0.85) *
    0.5
  )
}

/** Synthesizes softly swung shaker strokes at 76 BPM. */
function renderShakerSample(time: number, white: number) {
  const stepLength = 60 / 76 / 4
  const step = Math.floor(time / stepLength)
  const swingOffset = step % 2 === 1 ? stepLength * 0.13 : 0
  const phase = (time - swingOffset + stepLength) % stepLength
  if (phase > 0.075) return 0
  const accent = step % 4 === 0 ? 1 : 0.58
  return white * Math.exp(-phase * 54) * accent
}

/** Synthesizes a quiet low root-and-fifth drone. */
function renderDroneSample(time: number) {
  const breath = 0.7 + 0.22 * Math.sin((Math.PI * 2 * time) / 16)
  return (
    (Math.sin(Math.PI * 2 * 55 * time) * 0.56 +
      Math.sin(Math.PI * 2 * 82.5 * time) * 0.28 +
      Math.sin(Math.PI * 2 * 110 * time) * 0.08) *
    breath
  )
}

/** Renders a true stereo binaural difference at the requested beat rate. */
function renderBinauralBuffer(context: AudioContext, tone: BinauralTone) {
  const duration = 16
  const sampleRate = context.sampleRate
  const buffer = context.createBuffer(2, duration * sampleRate, sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  renderBinauralSamples(left, right, sampleRate, tone)

  return buffer
}

/**
 * Synthesizes a restrained fallback drum loop at the requested tempo.
 *
 * @param time Current position within the rendered loop.
 * @param white Current white-noise sample for the snare and hat.
 * @param bpm Native tempo for the four-bar fallback.
 */
function renderDrumSample(time: number, white: number, bpm = 76) {
  const beatLength = 60 / bpm
  const beatPhase = time % beatLength
  const beat = Math.floor(time / beatLength) % 4
  const kick =
    (beat === 0 || beat === 2) && beatPhase < 0.22
      ? Math.sin(
          2 * Math.PI * (52 + 42 * Math.exp(-beatPhase * 24)) * beatPhase,
        ) * Math.exp(-beatPhase * 18)
      : 0
  const snare =
    (beat === 1 || beat === 3) && beatPhase < 0.16
      ? white * Math.exp(-beatPhase * 26) * 0.45
      : 0
  const eighthPhase = time % (beatLength / 2)
  const hat =
    eighthPhase < 0.045 ? white * Math.exp(-eighthPhase * 70) * 0.14 : 0
  return kick * 0.78 + snare + hat
}

/** Renders a hard 909-style kick through a ducked, distorted rumble network. */
function renderAcidTechnoKickSamples(
  samples: Float32Array,
  sampleRate: number,
) {
  const beatLength = 60 / 130
  const delay = new Float32Array(Math.floor(sampleRate * 0.138))
  const echo = new Float32Array(Math.floor(sampleRate * beatLength * 0.75))
  const random = createRandom(hashString("acid-techno-kick"))
  let delayIndex = 0
  let echoIndex = 0
  let rumbleLowPass = 0
  let previousRumbleLowPass = 0
  let echoLowPass = 0

  // The first pass settles the feedback path so the rendered loop joins
  // seamlessly instead of restarting its reverb tail at every boundary.
  for (let index = 0; index < samples.length * 2; index += 1) {
    const loopIndex = index % samples.length
    const time = loopIndex / sampleRate
    const phase = time % beatLength
    const beat = Math.floor(time / beatLength) % 4
    const accent = beat === 0 ? 1 : 0.88

    const pitchDecay = 38
    const phaseCycles =
      47 * phase + (132 / pitchDecay) * (1 - Math.exp(-pitchDecay * phase))
    const body =
      phase < 0.32
        ? Math.sin(Math.PI * 2 * phaseCycles) * Math.exp(-phase * 14.5) * accent
        : 0
    const sub =
      phase < 0.36
        ? Math.sin(Math.PI * 2 * 43 * phase) *
          Math.exp(-phase * 10.5) *
          0.38 *
          accent
        : 0
    const knock =
      phase < 0.09
        ? Math.sin(Math.PI * 2 * 118 * phase) * Math.exp(-phase * 42) * 0.32
        : 0
    const click =
      phase < 0.009 ? (random() * 2 - 1) * Math.exp(-phase * 310) * 0.22 : 0
    // Parallel sub and firm saturation flatten the crest into a dense punch
    // while keeping the final buffer safely bounded.
    const dry = Math.tanh((body + sub + knock + click) * 2.15)

    const delayed = delay[delayIndex]
    const feedback = Math.tanh(delayed * 1.15) * 0.46
    delay[delayIndex] = dry * 0.48 + feedback
    delayIndex = (delayIndex + 1) % delay.length

    // Two gentle one-pole stages darken the feedback into a warehouse-style
    // low rumble while the sidechain curve leaves room for the next transient.
    rumbleLowPass += (delayed - rumbleLowPass) * 0.018
    previousRumbleLowPass += (rumbleLowPass - previousRumbleLowPass) * 0.012
    const duck = Math.min(1, Math.max(0, (phase - 0.045) / 0.12))
    const rumble = Math.tanh(previousRumbleLowPass * 2.5) * duck * 0.78

    const echoed = echo[echoIndex]
    echoLowPass += (echoed - echoLowPass) * 0.04
    echo[echoIndex] = rumble * 0.42 + echoLowPass * 0.22
    echoIndex = (echoIndex + 1) % echo.length

    const output =
      Math.tanh((dry * 0.96 + rumble * 0.62 + echoLowPass * 0.22) * 0.98) * 0.84

    if (index >= samples.length) samples[loopIndex] = output
  }
}

/** Synthesizes a muted metronomic tape pulse. */
function renderPulseSample(time: number, pink: number) {
  const pulsePhase = time % (60 / 68)
  const pulse =
    pulsePhase < 0.3
      ? Math.sin(Math.PI * 2 * 92 * pulsePhase) * Math.exp(-pulsePhase * 13)
      : 0
  return pulse * 0.7 + pink * 0.12
}

/** Synthesizes a slow four-chord pad. */
function renderSynthSample(time: number) {
  const chords = [
    [130.81, 164.81, 196, 246.94],
    [110, 146.83, 164.81, 220],
    [98, 123.47, 146.83, 196],
    [116.54, 146.83, 174.61, 220],
  ]
  const chord = chords[Math.floor(time / 4) % chords.length]
  const phase = time % 4
  const envelope = Math.min(1, phase / 1.4) * Math.min(1, (4 - phase) / 1.4)
  return (
    chord.reduce(
      (sum, frequency) =>
        sum +
        Math.sin(Math.PI * 2 * frequency * time) * 0.17 +
        Math.sin(Math.PI * 2 * frequency * 2 * time) * 0.035,
      0,
    ) * envelope
  )
}

/** Renders a driven, resonant 303-style sequence at a 130 BPM native tempo. */
function renderAcidSynthSamples(samples: Float32Array, sampleRate: number) {
  const stepLength = 60 / 130 / 4
  const echo = new Float32Array(Math.floor(stepLength * 3 * sampleRate))
  let oscillatorPhase = 0
  let frequency = 55
  let filterState1 = 0
  let filterState2 = 0
  let echoIndex = 0
  let echoLowPass = 0

  // Render twice so the oscillator, filter, and echo are already settled when
  // the saved pass begins, making the repeated buffer feel continuous.
  for (let index = 0; index < samples.length * 2; index += 1) {
    const loopIndex = index % samples.length
    const time = loopIndex / sampleRate
    const absoluteStep = Math.floor(time / stepLength)
    const step = absoluteStep % ACID_SYNTH_SEMITONES.length
    const stepPhase = time % stepLength
    const accent = ACID_SYNTH_ACCENTS.has(step)
    const previousStep =
      (step - 1 + ACID_SYNTH_SEMITONES.length) % ACID_SYNTH_SEMITONES.length
    const targetFrequency = 55 * 2 ** (ACID_SYNTH_SEMITONES[step] / 12)
    const shouldSlide = ACID_SYNTH_SLIDES.has(previousStep)
    const glideTime = shouldSlide ? 0.055 : 0.002
    frequency +=
      (targetFrequency - frequency) *
      (1 - Math.exp(-1 / (glideTime * sampleRate)))
    oscillatorPhase = (oscillatorPhase + frequency / sampleRate) % 1

    const isRest = ACID_SYNTH_RESTS.has(step)
    const attack = Math.min(1, stepPhase / 0.0025)
    const ampEnvelope = isRest
      ? 0
      : attack * Math.exp(-stepPhase * (accent ? 3.8 : 5.8))
    const filterEnvelope = Math.exp(-stepPhase * (accent ? 13 : 19))
    const barMovement =
      0.5 + 0.5 * Math.sin((Math.PI * 2 * absoluteStep) / 64 - Math.PI / 2)
    const cutoff = Math.min(
      sampleRate * 0.42,
      240 + barMovement * 520 + filterEnvelope * (accent ? 5_800 : 3_100),
    )

    const saw = oscillatorPhase * 2 - 1
    const square = oscillatorPhase < 0.5 ? 1 : -1
    const drivenOscillator = Math.tanh((saw * 0.88 + square * 0.12) * 1.7)

    // A zero-delay state-variable low-pass gives the animated, high-resonance
    // squelch; the nonlinear stages add the harder modern techno edge.
    const g = Math.tan((Math.PI * cutoff) / sampleRate)
    const resonance = accent ? 0.115 : 0.16
    const a1 = 1 / (1 + g * (g + resonance))
    const a2 = g * a1
    const a3 = g * a2
    const v3 = drivenOscillator - filterState2
    const band = a1 * filterState1 + a2 * v3
    const low = filterState2 + a2 * filterState1 + a3 * v3
    filterState1 = 2 * band - filterState1
    filterState2 = 2 * low - filterState2

    const acid = low * 0.8 + band * (accent ? 0.32 : 0.2)
    const dry = Math.tanh(acid * 3.4) * ampEnvelope
    const delayed = echo[echoIndex]
    echoLowPass += (delayed - echoLowPass) * 0.075
    echo[echoIndex] = dry * 0.72 + Math.tanh(echoLowPass * 1.35) * 0.52
    echoIndex = (echoIndex + 1) % echo.length

    // The dark three-sixteenth echo behaves like a compact room tail: it
    // fills pattern rests and blends the line without washing out the attack.
    const wet = Math.tanh(echoLowPass * 1.8)
    const output = Math.tanh((dry * 0.72 + wet * 0.38) * 1.08) * 0.7
    if (index >= samples.length) samples[loopIndex] = output
  }
}

/** Synthesizes widely spaced, bell-like keyboard notes. */
function renderKeysSample(time: number) {
  const frequencies = [261.63, 329.63, 392, 493.88, 440, 329.63, 293.66, 392]
  const noteLength = 2
  const phase = time % noteLength
  const frequency =
    frequencies[Math.floor(time / noteLength) % frequencies.length]
  const envelope = Math.exp(-phase * 2.1)
  return (
    (Math.sin(Math.PI * 2 * frequency * time) * 0.7 +
      Math.sin(Math.PI * 4 * frequency * time) * 0.18) *
    envelope
  )
}

/** Hashes a track id into a stable positive seed. */
function hashString(value: string) {
  return Array.from(value).reduce(
    (hash, character) => Math.imul(31, hash) + character.charCodeAt(0),
    2_166_136_261,
  )
}

/** Creates a small deterministic pseudo-random number generator. */
function createRandom(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b_79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

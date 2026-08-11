export const NEURAL_MODULATION_MODES = [
  "off",
  "gentle",
  "focus",
  "deep",
] as const

export const NEURAL_MODULATION_INTENSITIES = [
  "soft",
  "balanced",
  "strong",
] as const

export type NeuralModulationMode = (typeof NEURAL_MODULATION_MODES)[number]
export type NeuralModulationIntensity =
  (typeof NEURAL_MODULATION_INTENSITIES)[number]

export interface NeuralModulationSettings {
  mode: NeuralModulationMode
  intensity: NeuralModulationIntensity
}

export const DEFAULT_NEURAL_MODULATION: NeuralModulationSettings = {
  mode: "off",
  intensity: "balanced",
}

export const NEURAL_MODULATION_FREQUENCIES: Record<
  NeuralModulationMode,
  number
> = {
  off: 0,
  gentle: 8,
  focus: 16,
  deep: 32,
}

export const NEURAL_MODULATION_DEPTHS: Record<
  NeuralModulationIntensity,
  number
> = {
  soft: 0.06,
  balanced: 0.09,
  strong: 0.12,
}

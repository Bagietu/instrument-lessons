// Pitch detection using the YIN algorithm (de Cheveigné & Kawahara, 2002).
// Works well for monophonic sources: a single piano key, a guitar string, a voice.

export interface PitchResult {
  /** Detected fundamental frequency in Hz. */
  frequency: number
  /** 0..1, how periodic the signal is. Below ~0.8 the reading is unreliable. */
  clarity: number
}

export interface DetectOptions {
  /** Lowest frequency to look for, in Hz. Default 60 (below low E on guitar). */
  minFrequency?: number
  /** Highest frequency to look for, in Hz. Default 1500. */
  maxFrequency?: number
  /** YIN threshold; lower is stricter. Default 0.15. */
  threshold?: number
  /** Signals quieter than this RMS are treated as silence. Default 0.01. */
  minVolume?: number
}

export function rms(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  options: DetectOptions = {},
): PitchResult | null {
  const { minFrequency = 60, maxFrequency = 1500, threshold = 0.15, minVolume = 0.01 } = options

  if (rms(buffer) < minVolume) return null

  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency))
  const maxTau = Math.min(Math.floor(buffer.length / 2), Math.ceil(sampleRate / minFrequency))
  if (maxTau <= minTau) return null

  const windowSize = buffer.length - maxTau
  const diff = new Float32Array(maxTau + 1)

  // Step 2: difference function.
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0
    for (let i = 0; i < windowSize; i++) {
      const d = buffer[i] - buffer[i + tau]
      sum += d * d
    }
    diff[tau] = sum
  }

  // Step 3: cumulative mean normalized difference.
  const cmnd = new Float32Array(maxTau + 1)
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= maxTau; tau++) {
    running += diff[tau]
    cmnd[tau] = running === 0 ? 1 : (diff[tau] * tau) / running
  }

  // Step 4: absolute threshold — first dip below threshold, then walk to its local minimum.
  let tauEstimate = -1
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau++
      tauEstimate = tau
      break
    }
  }

  // No dip under the threshold: fall back to the global minimum if it is reasonably clear.
  if (tauEstimate === -1) {
    let best = minTau
    for (let tau = minTau + 1; tau <= maxTau; tau++) if (cmnd[tau] < cmnd[best]) best = tau
    if (cmnd[best] > 0.35) return null
    tauEstimate = best
  }

  // Step 5: parabolic interpolation for sub-sample accuracy.
  let betterTau = tauEstimate
  if (tauEstimate > 1 && tauEstimate < maxTau) {
    const s0 = cmnd[tauEstimate - 1]
    const s1 = cmnd[tauEstimate]
    const s2 = cmnd[tauEstimate + 1]
    const denom = 2 * (2 * s1 - s2 - s0)
    if (denom !== 0) betterTau = tauEstimate + (s2 - s0) / denom
  }

  return {
    frequency: sampleRate / betterTau,
    clarity: Math.max(0, Math.min(1, 1 - cmnd[tauEstimate])),
  }
}

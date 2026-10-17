import { noteFromLabel } from './notes'

let context: AudioContext | null = null

/** Plays a short, soft tone so the learner can hear the target note. */
export function playReferenceTone(label: string, seconds = 0.9): void {
  context ??= new AudioContext()
  const ctx = context
  void ctx.resume()
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
  gain.connect(ctx.destination)

  const frequency = noteFromLabel(label).frequency
  // A fundamental plus a quieter octave sounds closer to a real instrument than a bare sine.
  for (const [multiple, level] of [[1, 1], [2, 0.3], [3, 0.12]] as const) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = frequency * multiple
    g.gain.value = level
    osc.connect(g).connect(gain)
    osc.start(now)
    osc.stop(now + seconds)
  }
}

/** A short happy arpeggio for finishing a lesson. */
export function playCelebration(): void {
  ;['C5', 'E5', 'G5', 'C6'].forEach((label, i) => setTimeout(() => playReferenceTone(label, 0.35), i * 110))
}

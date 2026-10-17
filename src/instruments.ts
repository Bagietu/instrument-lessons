import type { DetectOptions } from './audio/pitch'

export type InstrumentId = 'piano' | 'guitar' | 'voice'

export interface Instrument {
  id: InstrumentId
  name: string
  emoji: string
  tagline: string
  /** Pitch range to listen for. */
  detect: DetectOptions
  /** Reference notes shown on the tuner (e.g. guitar strings). */
  referenceNotes?: string[]
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'piano',
    name: 'Piano',
    emoji: '🎹',
    tagline: 'Read notes and play melodies',
    detect: { minFrequency: 50, maxFrequency: 2100 },
  },
  {
    id: 'guitar',
    name: 'Guitar',
    emoji: '🎸',
    tagline: 'Tune up, then learn your first chords',
    detect: { minFrequency: 70, maxFrequency: 1200 },
    referenceNotes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  },
  {
    id: 'voice',
    name: 'Singing',
    emoji: '🎤',
    tagline: 'Match pitch and sing in tune',
    detect: { minFrequency: 70, maxFrequency: 1100 },
  },
]

export function getInstrument(id: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.id === id)
}

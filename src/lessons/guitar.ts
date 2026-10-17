import { noteFromLabel } from '../audio/notes'

export const GUITAR_STRINGS = [
  { number: 6, label: 'E2' },
  { number: 5, label: 'A2' },
  { number: 4, label: 'D3' },
  { number: 3, label: 'G3' },
  { number: 2, label: 'B3' },
  { number: 1, label: 'E4' },
]

export interface FretPosition {
  /** String number, 6 = low E … 1 = high E. */
  string: number
  /** Open-string note name, e.g. "A". */
  stringName: string
  fret: number
}

/** The beginner-friendly place to play a note: the lowest fret available (0–4 preferred). */
export function guitarPosition(label: string): FretPosition | null {
  const midi = noteFromLabel(label).midi
  let best: FretPosition | null = null
  for (const s of GUITAR_STRINGS) {
    const open = noteFromLabel(s.label)
    const fret = midi - open.midi
    if (fret < 0 || fret > 12) continue
    if (!best || fret < best.fret) best = { string: s.number, stringName: open.name, fret }
  }
  return best
}

export function describePosition(p: FretPosition): string {
  return p.fret === 0 ? `${p.stringName} string, open` : `${p.stringName} string, fret ${p.fret}`
}

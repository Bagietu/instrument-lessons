// Note names, MIDI numbers and frequencies (equal temperament, A4 = 440 Hz).

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export interface Note {
  /** MIDI note number, e.g. 69 for A4. */
  midi: number
  /** Name without octave, e.g. "A". */
  name: string
  octave: number
  /** Name with octave, e.g. "A4". */
  label: string
  /** Exact frequency of this note in Hz. */
  frequency: number
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

export function noteFromMidi(midi: number): Note {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return { midi, name, octave, label: `${name}${octave}`, frequency: midiToFrequency(midi) }
}

/** Parses labels like "E2", "C#4" or "Bb3" into a Note. */
export function noteFromLabel(label: string): Note {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(label.trim())
  if (!match) throw new Error(`Not a note: ${label}`)
  const [, letter, accidental, octave] = match
  let index = NOTE_NAMES.indexOf(letter as (typeof NOTE_NAMES)[number])
  if (accidental === '#') index += 1
  if (accidental === 'b') index -= 1
  return noteFromMidi((Number(octave) + 1) * 12 + index)
}

export interface NoteReading {
  note: Note
  /** How far the played frequency is from the nearest note, -50..+50 cents. */
  cents: number
}

export function nearestNote(frequency: number): NoteReading {
  const exact = frequencyToMidi(frequency)
  const midi = Math.round(exact)
  return { note: noteFromMidi(midi), cents: Math.round((exact - midi) * 100) }
}

/** Cents between a played frequency and a target note (positive = sharp). */
export function centsFrom(frequency: number, target: Note): number {
  return 1200 * Math.log2(frequency / target.frequency)
}

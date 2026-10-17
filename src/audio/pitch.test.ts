import { describe, expect, it } from 'vitest'
import { detectPitch } from './pitch'
import { centsFrom, nearestNote, noteFromLabel } from './notes'

const SAMPLE_RATE = 44100
const SIZE = 4096

function tone(frequency: number, harmonics: number[] = [1], amplitude = 0.5, noise = 0): Float32Array {
  const buffer = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    const t = i / SAMPLE_RATE
    let v = 0
    harmonics.forEach((weight, h) => (v += weight * Math.sin(2 * Math.PI * frequency * (h + 1) * t)))
    buffer[i] = amplitude * v + noise * (Math.random() * 2 - 1)
  }
  return buffer
}

describe('detectPitch', () => {
  it.each(['E2', 'A2', 'D3', 'G3', 'B3', 'E4', 'C4', 'A4', 'C6'])('finds a pure %s', (label) => {
    const note = noteFromLabel(label)
    const result = detectPitch(tone(note.frequency), SAMPLE_RATE)
    expect(result).not.toBeNull()
    expect(Math.abs(centsFrom(result!.frequency, note))).toBeLessThan(5)
  })

  it('finds the fundamental of a harmonic-rich tone (like a guitar string)', () => {
    const note = noteFromLabel('A2')
    const result = detectPitch(tone(note.frequency, [0.6, 1, 0.8, 0.5, 0.3]), SAMPLE_RATE)
    expect(nearestNote(result!.frequency).note.label).toBe('A2')
  })

  it('copes with some background noise', () => {
    const note = noteFromLabel('G3')
    const result = detectPitch(tone(note.frequency, [1, 0.5], 0.4, 0.05), SAMPLE_RATE)
    expect(nearestNote(result!.frequency).note.label).toBe('G3')
  })

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(SIZE), SAMPLE_RATE)).toBeNull()
  })

  it('returns null for pure noise', () => {
    const noise = Float32Array.from({ length: SIZE }, () => Math.random() * 2 - 1)
    const result = detectPitch(noise, SAMPLE_RATE)
    expect(result === null || result.clarity < 0.8).toBe(true)
  })
})

describe('notes', () => {
  it('names notes and measures cents', () => {
    expect(nearestNote(440).note.label).toBe('A4')
    expect(nearestNote(445).cents).toBe(20)
    expect(noteFromLabel('Bb3').label).toBe('A#3')
    expect(noteFromLabel('E2').frequency).toBeCloseTo(82.41, 1)
  })
})

import { describe, expect, it } from 'vitest'
import { noteFromLabel } from '../audio/notes'
import { getInstrument } from '../instruments'
import { LESSONS } from './data'
import { guitarPosition } from './guitar'

describe('built-in lessons', () => {
  it('have unique ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
  })

  it.each(LESSONS.map((l) => [l.id, l] as const))('%s is valid', (_, lesson) => {
    const instrument = getInstrument(lesson.instrument)!
    expect(instrument).toBeDefined()
    expect(lesson.steps.length).toBeGreaterThan(0)
    for (const step of lesson.steps) {
      if (step.kind !== 'notes') continue
      expect(step.notes.length).toBeGreaterThan(0)
      if (step.hints) expect(step.hints).toHaveLength(step.notes.length)
      for (const label of step.notes) {
        const note = noteFromLabel(label)
        expect(note.frequency).toBeGreaterThanOrEqual(instrument.detect.minFrequency!)
        expect(note.frequency).toBeLessThanOrEqual(instrument.detect.maxFrequency!)
        if (lesson.instrument === 'guitar') expect(guitarPosition(label)?.fret).toBeLessThanOrEqual(4)
      }
    }
  })
})

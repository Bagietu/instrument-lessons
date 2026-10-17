import { describe, expect, it } from 'vitest'
import { buildGenerationPrompt, labelToMidi, validateLesson } from './format'
import { noteFromLabel } from '../audio/notes'
import { LESSONS } from './data'

const base = {
  instrument: 'piano',
  title: 'Test lesson',
  description: 'd',
  level: 1,
  steps: [{ kind: 'notes', instruction: 'Play', notes: ['C4', 'D4'] }],
}

describe('validateLesson', () => {
  it('accepts every built-in lesson unchanged', () => {
    for (const lesson of LESSONS) expect(validateLesson(lesson)).toEqual({ ok: true, lesson })
  })

  it('makes an id from the title when none is given', () => {
    const r = validateLesson(base)
    expect(r.ok && r.lesson.id).toBe('piano-test-lesson')
  })

  it('rejects bad notes and out-of-range notes', () => {
    const r = validateLesson({ ...base, steps: [{ kind: 'notes', instruction: 'x', notes: ['H4', 'C9'] }] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/"H4" isn't a note.*C9 is out of range/)
  })

  it('rejects hint counts that do not match the notes', () => {
    const r = validateLesson({ ...base, steps: [{ kind: 'notes', instruction: 'x', notes: ['C4', 'D4'], hints: ['1'] }] })
    expect(r.ok).toBe(false)
  })

  it('cleans up Claude-style flat steps', () => {
    const r = validateLesson({
      ...base,
      steps: [
        { kind: 'info', title: '', text: 'Hello', instruction: '', notes: [], hints: [] },
        { kind: 'notes', title: '', text: '', instruction: 'Play', notes: ['E4'], hints: [] },
      ],
    })
    expect(r.ok && r.lesson.steps).toEqual([
      { kind: 'info', text: 'Hello' },
      { kind: 'notes', instruction: 'Play', notes: ['E4'] },
    ])
  })

  it('rejects unknown instruments and empty lessons', () => {
    expect(validateLesson({ ...base, instrument: 'drums' }).ok).toBe(false)
    expect(validateLesson({ ...base, steps: [] }).ok).toBe(false)
    expect(validateLesson(null).ok).toBe(false)
  })
})

describe('labelToMidi', () => {
  it('matches the app note parser', () => {
    for (const label of ['C4', 'F#3', 'Bb2', 'E2', 'C6', 'Cb4', 'B#3']) {
      expect(labelToMidi(label)).toBe(noteFromLabel(label).midi)
    }
    expect(labelToMidi('X1')).toBeNull()
  })
})

describe('buildGenerationPrompt', () => {
  it('mentions the instrument rules, level, request and existing titles', () => {
    const prompt = buildGenerationPrompt('guitar', 2, 'G major chord', ['Open strings'])
    expect(prompt).toMatch(/standard tuning/)
    expect(prompt).toMatch(/level: 2/)
    expect(prompt).toMatch(/G major chord/)
    expect(prompt).toMatch(/Open strings/)
  })
})

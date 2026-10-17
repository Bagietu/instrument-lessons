import { slugify } from '../lessons/format'
import type { InstrumentId } from '../instruments'
import type { Lesson, LessonStep } from '../lessons/types'

// Notes and hints are edited as text: notes separated by spaces ("C4 D4 E4"),
// hints separated by slashes ("Twin / kle / twin") so lyrics can contain spaces.

export interface DraftStep {
  kind: 'info' | 'notes'
  title: string
  text: string
  instruction: string
  notesText: string
  hintsText: string
}

export interface Draft {
  id: string
  instrument: InstrumentId
  title: string
  description: string
  level: number
  position?: number
  steps: DraftStep[]
}

export const emptyStep = (kind: DraftStep['kind']): DraftStep => ({ kind, title: '', text: '', instruction: '', notesText: '', hintsText: '' })

export function lessonToDraft(lesson: Lesson): Draft {
  return {
    id: lesson.id,
    instrument: lesson.instrument,
    title: lesson.title,
    description: lesson.description,
    level: lesson.level,
    position: lesson.position,
    steps: lesson.steps.map((s: LessonStep) =>
      s.kind === 'info'
        ? { ...emptyStep('info'), title: s.title ?? '', text: s.text }
        : { ...emptyStep('notes'), instruction: s.instruction, notesText: s.notes.join(' '), hintsText: (s.hints ?? []).join(' / ') },
    ),
  }
}

export function newDraft(instrument: InstrumentId): Draft {
  return { id: '', instrument, title: '', description: '', level: 1, steps: [emptyStep('info'), emptyStep('notes')] }
}

export function draftToInput(d: Draft) {
  return {
    id: d.id || slugify(`${d.instrument}-${d.title}`),
    instrument: d.instrument,
    title: d.title,
    description: d.description,
    level: d.level,
    position: d.position,
    steps: d.steps.map((s) =>
      s.kind === 'info'
        ? { kind: 'info', title: s.title, text: s.text }
        : {
            kind: 'notes',
            instruction: s.instruction,
            notes: s.notesText.split(/[\s,]+/).filter(Boolean),
            hints: s.hintsText.trim() ? s.hintsText.split('/').map((h) => h.trim()) : [],
          },
    ),
  }
}

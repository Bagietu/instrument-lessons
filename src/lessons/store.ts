import { createContext, useContext } from 'react'
import type { InstrumentId } from '../instruments'
import type { Lesson } from './types'

export interface LessonStore {
  lessons: Lesson[]
  /** Shows a new set of lessons right away, before the redeployed site catches up. */
  replace: (lessons: Lesson[]) => void
}

export const LessonsContext = createContext<LessonStore | null>(null)

export function useLessons(): LessonStore {
  const store = useContext(LessonsContext)
  if (!store) throw new Error('useLessons must be used inside LessonsProvider')
  return store
}

/** One instrument's lessons, in their saved order. */
export function lessonsFor(lessons: Lesson[], instrument: InstrumentId): Lesson[] {
  return lessons
    .filter((l) => l.instrument === instrument)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

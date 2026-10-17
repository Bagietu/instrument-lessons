import { createContext, useContext } from 'react'
import { validateLesson } from '../../supabase/functions/_shared/lesson.ts'
import { SUPABASE_KEY, SUPABASE_URL } from '../config'
import type { InstrumentId } from '../instruments'
import type { Lesson } from './types'

// Where lessons come from: the database when it has any, otherwise the built-in starters.

export interface LessonStore {
  lessons: Lesson[]
  source: 'builtin' | 'database'
  loading: boolean
  error: string | null
  /** Lessons stored in the database (empty when there is no backend). */
  databaseLessons: Lesson[]
  reload: () => Promise<void>
}

export const LessonsContext = createContext<LessonStore | null>(null)

export async function fetchDatabaseLessons(): Promise<Lesson[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/lessons?select=*&order=instrument.asc,position.asc,title.asc`, {
    headers: { apikey: SUPABASE_KEY },
  })
  if (!res.ok) throw new Error(`Couldn’t load lessons (${res.status}).`)
  const rows = (await res.json()) as unknown[]
  // Skip anything malformed rather than crashing the app.
  return rows.flatMap((row) => {
    const result = validateLesson(row)
    return result.ok ? [result.lesson] : []
  })
}

export function useLessons(): LessonStore {
  const store = useContext(LessonsContext)
  if (!store) throw new Error('useLessons must be used inside LessonsProvider')
  return store
}

export function lessonsFor(lessons: Lesson[], instrument: InstrumentId): Lesson[] {
  return lessons.filter((l) => l.instrument === instrument)
}

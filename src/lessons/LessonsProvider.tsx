import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { HAS_BACKEND } from '../config'
import { LESSONS } from './data'
import { fetchDatabaseLessons, LessonsContext, type LessonStore } from './store'
import type { Lesson } from './types'

export function LessonsProvider({ children }: { children: ReactNode }) {
  const [databaseLessons, setDatabaseLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(HAS_BACKEND)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((result: Promise<Lesson[]>) => {
    return result
      .then((lessons) => {
        setDatabaseLessons(lessons)
        setError(null)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Couldn’t load lessons.'))
      .finally(() => setLoading(false))
  }, [])

  const reload = useCallback(async () => {
    if (!HAS_BACKEND) return
    setLoading(true)
    await apply(fetchDatabaseLessons())
  }, [apply])

  useEffect(() => {
    if (HAS_BACKEND) void apply(fetchDatabaseLessons())
  }, [apply])

  const useDatabase = databaseLessons.length > 0
  const value: LessonStore = {
    lessons: useDatabase ? databaseLessons : LESSONS,
    source: useDatabase ? 'database' : 'builtin',
    loading,
    error,
    databaseLessons,
    reload,
  }
  return <LessonsContext.Provider value={value}>{children}</LessonsContext.Provider>
}

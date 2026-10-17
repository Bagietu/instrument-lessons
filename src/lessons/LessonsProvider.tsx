import { useState, type ReactNode } from 'react'
import { LESSONS } from './data'
import { LessonsContext } from './store'

export function LessonsProvider({ children }: { children: ReactNode }) {
  const [lessons, replace] = useState(LESSONS)
  return <LessonsContext.Provider value={{ lessons, replace }}>{children}</LessonsContext.Provider>
}

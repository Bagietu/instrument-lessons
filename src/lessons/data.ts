import type { Lesson } from './types'
import saved from './lessons.json'

// The lessons live in lessons.json in the repository. The admin panel edits that file
// through GitHub, and every change redeploys the site.
export const LESSONS = saved as Lesson[]

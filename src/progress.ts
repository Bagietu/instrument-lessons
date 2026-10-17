// Which lessons this browser has finished. Kept in localStorage for now;
// step 4 of the plan replaces this with proper progress tracking.

const KEY = 'instrument-lessons:completed'

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function isCompleted(lessonId: string): boolean {
  return read().has(lessonId)
}

export function markCompleted(lessonId: string): void {
  const done = read()
  done.add(lessonId)
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]))
  } catch {
    // Storage can be unavailable (private mode); progress just isn't remembered.
  }
}

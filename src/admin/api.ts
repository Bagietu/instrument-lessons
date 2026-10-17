import { SUPABASE_KEY, SUPABASE_URL } from '../config'
import type { InstrumentId } from '../instruments'
import type { Lesson } from '../lessons/types'

export class AdminError extends Error {
  readonly details: string[]
  readonly status: number
  constructor(message: string, status: number, details: string[] = []) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function call<T>(password: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ password, action, ...payload }),
    })
  } catch {
    throw new AdminError('Couldn’t reach the server. Check your connection.', 0)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: string[] } & T
  if (!res.ok) {
    const details = body.errors ?? []
    throw new AdminError(body.error ?? details[0] ?? `Server error ${res.status}.`, res.status, details)
  }
  return body
}

export const adminApi = {
  check: (password: string) => call<{ ok: true; canGenerate: boolean }>(password, 'check'),
  save: (password: string, lesson: Lesson, previousId?: string) =>
    call<{ lesson: Lesson }>(password, 'save', { lesson, previousId }),
  remove: (password: string, id: string) => call<{ ok: true }>(password, 'delete', { id }),
  importLessons: (password: string, lessons: Lesson[]) => call<{ count: number }>(password, 'import', { lessons }),
  generate: (password: string, instrument: InstrumentId, level: number, request: string) =>
    call<{ lesson: Lesson }>(password, 'generate', { instrument, level, request }),
}

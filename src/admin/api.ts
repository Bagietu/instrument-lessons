import type { InstrumentId } from '../instruments'
import { GENERATED_LESSON_SCHEMA, buildGenerationPrompt, validateLesson } from '../lessons/format'
import type { Lesson } from '../lessons/types'

// The admin panel has no server. Lessons are saved by committing src/lessons/lessons.json
// to the repository with the admin's own GitHub token, which redeploys the site.
// Lesson drafts come straight from the Claude API with the admin's own API key.
// Both keys stay in this browser only.

export const ADMIN_PASSWORD = 'start123'
export const REPO = 'Bagietu/instrument-lessons'
const FILE = 'src/lessons/lessons.json'
const BRANCH = 'main'

export interface Keys {
  github: string
  claude: string
}

export class AdminError extends Error {}

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function decode(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

async function github<T>(token: string, method: 'GET' | 'PUT', body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}${method === 'GET' ? `?ref=${BRANCH}` : ''}`, {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new AdminError('Couldn’t reach GitHub. Check your connection.')
  }
  if (res.status === 401) throw new AdminError('GitHub rejected the token. Paste a new one under Keys.')
  if (res.status === 403 || res.status === 404)
    throw new AdminError('The GitHub token can’t change this repository. Give it “Contents: Read and write” access.')
  if (res.status === 409) throw new AdminError('Someone else saved at the same moment. Try again.')
  if (!res.ok) throw new AdminError(`GitHub error ${res.status}.`)
  return (await res.json()) as T
}

/** Lessons as they are saved in the repository right now, with the version to write over. */
export async function loadLessons(token: string): Promise<{ lessons: Lesson[]; sha: string }> {
  const file = await github<{ sha: string; content: string }>(token, 'GET')
  const raw = JSON.parse(decode(file.content)) as unknown[]
  const lessons = raw.flatMap((row) => {
    const result = validateLesson(row)
    return result.ok ? [result.lesson] : []
  })
  return { lessons, sha: file.sha }
}

/** Writes the whole list back as one commit; the site redeploys about a minute later. */
export async function saveLessons(token: string, lessons: Lesson[], sha: string, message: string): Promise<string> {
  const ordered = [...lessons].sort(
    (a, b) => a.instrument.localeCompare(b.instrument) || (a.position ?? 0) - (b.position ?? 0),
  )
  const res = await github<{ content: { sha: string } }>(token, 'PUT', {
    message,
    branch: BRANCH,
    sha,
    content: encode(JSON.stringify(ordered, null, 2) + '\n'),
  })
  return res.content.sha
}

export async function generateLesson(
  apiKey: string,
  instrument: InstrumentId,
  level: number,
  request: string,
  existingTitles: string[],
): Promise<Lesson> {
  // Loaded only when needed so visitors never download the SDK.
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  let response
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: GENERATED_LESSON_SCHEMA } },
      messages: [{ role: 'user', content: buildGenerationPrompt(instrument, level, request.slice(0, 1000), existingTitles) }],
    })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AdminError('The Claude API key was rejected. Paste a new one under Keys.')
    if (err instanceof Anthropic.RateLimitError) throw new AdminError('Claude is busy, try again in a minute.')
    if (err instanceof Anthropic.APIError) throw new AdminError(`Claude error ${err.status}.`)
    throw new AdminError('Couldn’t reach Claude. Check your connection.')
  }

  if (response.stop_reason === 'refusal') throw new AdminError('Claude declined to write this lesson. Try describing it differently.')
  if (response.stop_reason === 'max_tokens') throw new AdminError('The lesson came out too long. Ask for something shorter.')
  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  let draft: unknown
  try {
    draft = JSON.parse(text)
  } catch {
    throw new AdminError('Claude returned something that was not a lesson. Try again.')
  }
  const result = validateLesson({ ...(draft as object), instrument })
  if (!result.ok) throw new AdminError(result.errors[0] ?? 'Claude’s lesson didn’t pass the checks. Try again.')
  return result.lesson
}

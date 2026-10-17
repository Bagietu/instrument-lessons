// Admin API for the lessons database. Every request must carry the admin password.
// Actions: check, save, delete, import, generate.
//
// Secrets (set with `supabase secrets set`): ADMIN_PASSWORD, ANTHROPIC_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import Anthropic from 'npm:@anthropic-ai/sdk@0.135.0'
import {
  GENERATED_LESSON_SCHEMA,
  INSTRUMENT_IDS,
  buildGenerationPrompt,
  validateLesson,
  type InstrumentId,
  type Lesson,
} from '../_shared/lesson.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** Compares strings in constant time so the password can't be guessed from response timing. */
function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

async function db(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
      ...init.headers,
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Database error ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

function toRow(lesson: Lesson, fallbackPosition: number) {
  return {
    id: lesson.id,
    instrument: lesson.instrument,
    title: lesson.title,
    description: lesson.description,
    level: lesson.level,
    steps: lesson.steps,
    position: lesson.position ?? fallbackPosition,
    updated_at: new Date().toISOString(),
  }
}

async function nextPosition(instrument: InstrumentId): Promise<number> {
  const rows = (await db(`lessons?select=position&instrument=eq.${instrument}&order=position.desc&limit=1`)) as {
    position: number
  }[]
  return (rows[0]?.position ?? -1) + 1
}

async function generate(instrument: InstrumentId, level: number, request: string) {
  const existing = (await db(`lessons?select=title&instrument=eq.${instrument}`)) as { title: string }[]
  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: GENERATED_LESSON_SCHEMA } },
    messages: [
      { role: 'user', content: buildGenerationPrompt(instrument, level, request, existing.map((e) => e.title)) },
    ],
  })

  if (response.stop_reason === 'refusal') {
    return { ok: false as const, errors: ['Claude declined to write this lesson. Try describing it differently.'] }
  }
  if (response.stop_reason === 'max_tokens') {
    return { ok: false as const, errors: ['The lesson came out too long. Ask for something shorter.'] }
  }
  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  let draft: unknown
  try {
    draft = JSON.parse(text)
  } catch {
    return { ok: false as const, errors: ['Claude returned something that was not a lesson. Try again.'] }
  }
  // The draft is not saved: the admin reviews it in the editor first.
  return validateLesson({ ...(draft as object), instrument })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Send JSON.' }, 400)
  }

  const expected = Deno.env.get('ADMIN_PASSWORD') ?? ''
  if (!expected) return json({ error: 'ADMIN_PASSWORD is not set on the server.' }, 500)
  if (typeof body.password !== 'string' || !safeEqual(body.password, expected)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800))
    return json({ error: 'Wrong password.' }, 401)
  }

  try {
    switch (body.action) {
      case 'check':
        return json({ ok: true, canGenerate: Boolean(Deno.env.get('ANTHROPIC_API_KEY')) })

      case 'save': {
        const result = validateLesson(body.lesson)
        if (!result.ok) return json({ errors: result.errors }, 400)
        const position = result.lesson.position ?? (await nextPosition(result.lesson.instrument))
        // A renamed lesson keeps its row: previousId is the id it was loaded with.
        const previousId = typeof body.previousId === 'string' ? body.previousId : null
        const rows = await db('lessons?on_conflict=id', { method: 'POST', body: JSON.stringify([toRow(result.lesson, position)]) })
        if (previousId && previousId !== result.lesson.id) {
          await db(`lessons?id=eq.${encodeURIComponent(previousId)}`, { method: 'DELETE' })
        }
        return json({ lesson: (rows as unknown[])[0] })
      }

      case 'delete': {
        if (typeof body.id !== 'string' || !body.id) return json({ error: 'Missing lesson id.' }, 400)
        await db(`lessons?id=eq.${encodeURIComponent(body.id)}`, { method: 'DELETE' })
        return json({ ok: true })
      }

      case 'import': {
        // Bulk-adds lessons (used to copy the built-in starter lessons into the database).
        const list = Array.isArray(body.lessons) ? body.lessons : []
        const rows = []
        for (const [i, raw] of list.entries()) {
          const result = validateLesson(raw)
          if (!result.ok) return json({ errors: [`Lesson ${i + 1}: ${result.errors[0]}`] }, 400)
          rows.push(toRow(result.lesson, i))
        }
        if (rows.length) await db('lessons?on_conflict=id', { method: 'POST', body: JSON.stringify(rows) })
        return json({ ok: true, count: rows.length })
      }

      case 'generate': {
        if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, 500)
        const instrument = body.instrument as InstrumentId
        if (!INSTRUMENT_IDS.includes(instrument)) return json({ error: 'Unknown instrument.' }, 400)
        const level = [1, 2, 3].includes(Number(body.level)) ? Number(body.level) : 1
        const request = typeof body.request === 'string' ? body.request.slice(0, 1000) : ''
        const result = await generate(instrument, level, request)
        return result.ok ? json({ lesson: result.lesson }) : json({ errors: result.errors }, 422)
      }

      default:
        return json({ error: 'Unknown action.' }, 400)
    }
  } catch (err) {
    console.error(err)
    if (err instanceof Anthropic.APIError) {
      const message =
        err.status === 401 ? 'The Claude API key was rejected.' : err.status === 429 ? 'Claude is busy, try again in a minute.' : `Claude error ${err.status}.`
      return json({ error: message }, 502)
    }
    return json({ error: err instanceof Error ? err.message : 'Something went wrong.' }, 500)
  }
})

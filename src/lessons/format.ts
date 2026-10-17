// The lesson format, its validation, and the Claude prompt for generating lessons.
// Plain TypeScript with no imports.

export type InstrumentId = 'piano' | 'guitar' | 'voice'
export const INSTRUMENT_IDS: InstrumentId[] = ['piano', 'guitar', 'voice']

export interface InfoStep {
  kind: 'info'
  title?: string
  text: string
}

export interface NotesStep {
  kind: 'notes'
  /** What to tell the learner, e.g. "Play C, D, E going up". */
  instruction: string
  /** Notes to play in order, as labels like "C4", "F#3". */
  notes: string[]
  /** Optional lyric or finger hint shown under each note (same length as notes). */
  hints?: string[]
}

export type LessonStep = InfoStep | NotesStep

export interface Lesson {
  id: string
  instrument: InstrumentId
  title: string
  description: string
  level: 1 | 2 | 3
  steps: LessonStep[]
  /** Sort order within the instrument; lower comes first. */
  position?: number
}

/** Lowest and highest MIDI note each instrument's lessons may use. */
export const NOTE_RANGE: Record<InstrumentId, [number, number]> = {
  piano: [36, 96], // C2 – C7
  guitar: [40, 76], // E2 – E5 (fret 12 on the high E string)
  voice: [43, 84], // G2 – C6
}

const NOTE_PATTERN = /^([A-G])([#b]?)(-?\d)$/
const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** MIDI number for a label like "C#4", or null if it isn't a note. */
export function labelToMidi(label: string): number | null {
  const m = NOTE_PATTERN.exec(label.trim())
  if (!m) return null
  const [, letter, accidental, octave] = m
  return (Number(octave) + 1) * 12 + SEMITONES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export type ValidationResult = { ok: true; lesson: Lesson } | { ok: false; errors: string[] }

/** Checks untrusted input (from the admin form, the database or Claude) and returns a clean Lesson. */
export function validateLesson(input: unknown): ValidationResult {
  const errors: string[] = []
  const o = (input ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  const instrument = o.instrument as InstrumentId
  if (!INSTRUMENT_IDS.includes(instrument)) errors.push('Pick an instrument: piano, guitar or voice.')
  const title = str(o.title)
  if (!title) errors.push('The lesson needs a title.')
  if (title.length > 80) errors.push('Keep the title under 80 characters.')
  const id = str(o.id) || slugify(`${instrument}-${title}`)
  if (!/^[a-z0-9-]{1,80}$/.test(id)) errors.push('The id may only use lowercase letters, numbers and dashes.')
  const level = Number(o.level ?? 1)
  if (![1, 2, 3].includes(level)) errors.push('Level must be 1, 2 or 3.')
  const position = o.position === undefined || o.position === null ? undefined : Number(o.position)
  if (position !== undefined && !Number.isFinite(position)) errors.push('Position must be a number.')

  const rawSteps = Array.isArray(o.steps) ? o.steps : []
  if (rawSteps.length === 0) errors.push('Add at least one step.')
  if (rawSteps.length > 30) errors.push('Keep lessons to 30 steps or fewer.')

  const steps: LessonStep[] = rawSteps.map((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>
    const where = `Step ${i + 1}`
    if (s.kind === 'info') {
      const text = str(s.text)
      if (!text) errors.push(`${where}: the explanation is empty.`)
      const stepTitle = str(s.title)
      return stepTitle ? { kind: 'info', title: stepTitle, text } : { kind: 'info', text }
    }
    if (s.kind === 'notes') {
      const notes = (Array.isArray(s.notes) ? s.notes : []).map((n) => str(n))
      if (notes.length === 0) errors.push(`${where}: add at least one note.`)
      if (notes.length > 40) errors.push(`${where}: use 40 notes or fewer.`)
      const range = NOTE_RANGE[instrument]
      for (const n of notes) {
        const midi = labelToMidi(n)
        if (midi === null) errors.push(`${where}: "${n}" isn't a note. Use names like C4, F#3 or Bb4.`)
        else if (range && (midi < range[0] || midi > range[1])) errors.push(`${where}: ${n} is out of range for ${instrument}.`)
      }
      const instruction = str(s.instruction)
      if (!instruction) errors.push(`${where}: tell the learner what to play.`)
      const rawHints = Array.isArray(s.hints) ? s.hints.map((h) => str(h)) : []
      const hasHints = rawHints.some((h) => h !== '')
      if (hasHints && rawHints.length !== notes.length) {
        errors.push(`${where}: there are ${rawHints.length} hints for ${notes.length} notes.`)
      }
      return hasHints ? { kind: 'notes', instruction, notes, hints: rawHints } : { kind: 'notes', instruction, notes }
    }
    errors.push(`${where}: unknown step type.`)
    return { kind: 'info', text: '' }
  })

  if (errors.length) return { ok: false, errors }
  const lesson: Lesson = { id, instrument, title, description: str(o.description), level: level as 1 | 2 | 3, steps }
  if (position !== undefined) lesson.position = position
  return { ok: true, lesson }
}

// ---------- Claude generation ----------

/** JSON schema Claude's answer must follow. Flat steps keep the schema simple; empty fields are dropped by validateLesson. */
export const GENERATED_LESSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'level', 'steps'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    level: { type: 'integer', enum: [1, 2, 3] },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'text', 'instruction', 'notes', 'hints'],
        properties: {
          kind: { type: 'string', enum: ['info', 'notes'] },
          title: { type: 'string', description: 'info steps: optional heading; notes steps: empty' },
          text: { type: 'string', description: 'info steps: the explanation; notes steps: empty' },
          instruction: { type: 'string', description: 'notes steps: what to play; info steps: empty' },
          notes: { type: 'array', items: { type: 'string' }, description: 'notes steps: note names with octave, e.g. C4, F#3; info steps: []' },
          hints: { type: 'array', items: { type: 'string' }, description: 'notes steps: one finger number or lyric syllable per note, or []' },
        },
      },
    },
  },
} as const

const INSTRUMENT_GUIDE: Record<InstrumentId, string> = {
  piano:
    'Piano, right hand, single notes only. Middle C is C4. Hints are right-hand finger numbers (1 = thumb) or lyric syllables. Use notes between C3 and C6.',
  guitar:
    'Guitar in standard tuning (E2 A2 D3 G3 B3 E4). Use real sounding pitch (open low E string = E2). The app hears one note at a time, so chords must be written as one note per string, low to high, and explained in an info step first (finger, string, fret). Keep notes within the first 5 frets. Use notes between E2 and A4.',
  voice:
    'Singing. Any octave is accepted, so write melodies around C4–C5. Hints are solfège (Do Re Mi) or lyric syllables. Keep phrases short and comfortable for beginners.',
}

/** Builds the prompt for generating one lesson. */
export function buildGenerationPrompt(instrument: InstrumentId, level: number, request: string, existingTitles: string[]): string {
  return [
    'You write short, friendly beginner music lessons for a web app that listens through the microphone and checks each note the learner plays or sings.',
    '',
    `Instrument: ${INSTRUMENT_GUIDE[instrument]}`,
    `Difficulty level: ${level} (1 = first week, 2 = first month, 3 = getting comfortable).`,
    existingTitles.length ? `Lessons that already exist (don't repeat them): ${existingTitles.join('; ')}.` : '',
    '',
    'A lesson has 2–6 steps. "info" steps explain something in 1–3 plain sentences. "notes" steps list the notes to play in order (2–16 notes each) with a short instruction. Start with an info step when something new is introduced. Use correct melodies for any real songs; prefer public-domain songs.',
    'Note names are a letter A–G, an optional # or b, and an octave number, like C4, F#3 or Bb4.',
    '',
    `What the lesson should cover: ${request.trim() || 'choose a sensible next lesson for this level'}`,
  ].join('\n')
}

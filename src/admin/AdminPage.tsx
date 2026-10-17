import { useEffect, useState } from 'react'
import { INSTRUMENTS, type InstrumentId } from '../instruments'
import { lessonsFor, useLessons } from '../lessons/store'
import type { Lesson } from '../lessons/types'
import { href } from '../router'
import { ADMIN_PASSWORD, AdminError, REPO, generateLesson, loadLessons, saveLessons, type Keys } from './api'
import { lessonToDraft, newDraft, type Draft } from './draft'
import { LessonEditor } from './LessonEditor'

const LOGGED_IN_KEY = 'instrument-lessons:admin'
const KEYS_KEY = 'instrument-lessons:admin-keys'

function read(storage: () => Storage, key: string): string {
  try {
    return storage().getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key)
    else storage().setItem(key, value)
  } catch {
    // Not remembered; asked for again next time.
  }
}

function readKeys(): Keys {
  try {
    const keys = JSON.parse(read(() => localStorage, KEYS_KEY) || '{}') as Partial<Keys>
    return { github: keys.github ?? '', claude: keys.claude ?? '' }
  } catch {
    return { github: '', claude: '' }
  }
}

export function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(() => read(() => sessionStorage, LOGGED_IN_KEY) === 'yes')

  if (!loggedIn) {
    return (
      <Login
        onSuccess={() => {
          write(() => sessionStorage, LOGGED_IN_KEY, 'yes')
          setLoggedIn(true)
        }}
      />
    )
  }
  return (
    <Dashboard
      onLogout={() => {
        write(() => sessionStorage, LOGGED_IN_KEY, null)
        setLoggedIn(false)
      }}
    />
  )
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value === ADMIN_PASSWORD) onSuccess()
    else setError('That’s not the password.')
  }

  return (
    <section>
      <h1>Admin</h1>
      <form className="panel login" onSubmit={submit}>
        <label>
          Password
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" disabled={!value}>
          Log in
        </button>
      </form>
    </section>
  )
}

function KeysPanel({ keys, onChange }: { keys: Keys; onChange: (keys: Keys) => void }) {
  const [open, setOpen] = useState(!keys.github)
  const [draft, setDraft] = useState(keys)

  if (!open) {
    return (
      <div className="panel">
        <div className="lesson-head">
          <span>
            🔑 GitHub {keys.github ? 'connected' : 'not connected'} · Claude {keys.claude ? 'connected' : 'not connected'}
          </span>
          <button className="button secondary small" onClick={() => setOpen(true)}>
            Keys
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()
        const next = { github: draft.github.trim(), claude: draft.claude.trim() }
        write(() => localStorage, KEYS_KEY, JSON.stringify(next))
        onChange(next)
        setOpen(false)
      }}
    >
      <h2>🔑 Keys</h2>
      <p className="muted">
        These stay in this browser only, never on the website. Lessons are saved straight into the GitHub repository, and
        the site updates about a minute after each save.
      </p>
      <div className="form-grid">
        <label className="wide">
          GitHub token
          <input type="password" value={draft.github} onChange={(e) => setDraft({ ...draft, github: e.target.value })} />
          <small className="muted">
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              Make a fine-grained token
            </a>{' '}
            with access to only <b>{REPO}</b> and the permission <b>Contents: Read and write</b>.
          </small>
        </label>
        <label className="wide">
          Claude API key (optional, for generating lessons)
          <input type="password" value={draft.claude} onChange={(e) => setDraft({ ...draft, claude: e.target.value })} />
          <small className="muted">
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              Get one from the Claude Console
            </a>
            .
          </small>
        </label>
      </div>
      <button className="button">Save keys</button>
    </form>
  )
}

type Editing = { draft: Draft; originalId: string | null } | null
type Saved = { lessons: Lesson[]; sha: string }

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const store = useLessons()
  const [keys, setKeys] = useState(readKeys)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lessons = saved?.lessons ?? store.lessons

  useEffect(() => {
    if (!keys.github) return
    let cancelled = false
    loadLessons(keys.github).then(
      (result) => !cancelled && setSaved(result),
      (err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Couldn’t load lessons from GitHub.'),
    )
    return () => {
      cancelled = true
    }
  }, [keys.github])

  /** Saves a changed list as one commit and shows it here straight away. */
  const commit = async (next: Lesson[], what: string) => {
    if (!saved) throw new AdminError('Add a GitHub token under Keys to save changes.')
    const sha = await saveLessons(keys.github, next, saved.sha, what)
    setSaved({ lessons: next, sha })
    store.replace(next)
    return `${what}. The website updates in about a minute.`
  }

  const run = async (task: () => Promise<string>) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setMessage(await task())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const save = async (lesson: Lesson, previousId: string | null) => {
    const others = lessons.filter((l) => l.id !== (previousId ?? lesson.id))
    const old = lessons.find((l) => l.id === previousId)
    const position =
      old && old.instrument === lesson.instrument
        ? old.position
        : Math.max(-1, ...lessonsFor(others, lesson.instrument).map((l) => l.position ?? 0)) + 1
    const text = await commit([...others, { ...lesson, position }], `${previousId ? 'Updated' : 'Added'} “${lesson.title}”`)
    setEditing(null)
    setMessage(text)
  }

  const remove = (lesson: Lesson) => {
    if (!window.confirm(`Delete “${lesson.title}”?`)) return
    void run(() =>
      commit(
        lessons.filter((l) => l.id !== lesson.id),
        `Deleted “${lesson.title}”`,
      ),
    )
  }

  const move = (list: Lesson[], index: number, by: number) => {
    const order = list.map((l) => l.id)
    ;[order[index], order[index + by]] = [order[index + by], order[index]]
    const next = lessons.map((l) => (order.includes(l.id) ? { ...l, position: order.indexOf(l.id) } : l))
    void run(() => commit(next, `Moved “${list[index].title}”`))
  }

  if (editing) {
    return (
      <section>
        <LessonEditor
          initial={editing.draft}
          originalId={editing.originalId}
          takenIds={lessons.map((l) => l.id)}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      </section>
    )
  }

  const canSave = Boolean(saved) && !busy

  return (
    <section>
      <div className="lesson-head">
        <h1>Admin</h1>
        <button className="button secondary small" onClick={onLogout}>
          Log out
        </button>
      </div>

      {message && <p className="notice good">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <KeysPanel
        keys={keys}
        onChange={(next) => {
          setError('')
          setKeys(next)
        }}
      />

      <Generator
        apiKey={keys.claude}
        existingTitles={lessons.map((l) => l.title)}
        onDraft={(lesson) => setEditing({ draft: lessonToDraft({ ...lesson, id: '' }), originalId: null })}
      />

      {INSTRUMENTS.map((instrument) => {
        const list = lessonsFor(lessons, instrument.id)
        return (
          <div key={instrument.id}>
            <div className="lesson-head">
              <h2>
                {instrument.emoji} {instrument.name}
              </h2>
              <button
                className="button secondary small"
                disabled={!canSave}
                onClick={() => setEditing({ draft: newDraft(instrument.id), originalId: null })}
              >
                + New lesson
              </button>
            </div>
            {list.length === 0 && <p className="muted">No lessons yet.</p>}
            <ol className="lesson-list">
              {list.map((l, i) => (
                <li key={l.id} className="lesson-row admin-row">
                  <span className="lesson-text">
                    <span className="lesson-title">{l.title}</span>
                    <span className="lesson-desc">
                      Level {l.level} · {l.steps.length} steps
                    </span>
                  </span>
                  <span className="row tight">
                    <button className="icon-button" disabled={!canSave || i === 0} onClick={() => move(list, i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button
                      className="icon-button"
                      disabled={!canSave || i === list.length - 1}
                      onClick={() => move(list, i, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <a className="icon-button" href={href(l.instrument, 'lesson', l.id)} aria-label="Try it">
                      ▶
                    </a>
                    <button
                      className="icon-button"
                      disabled={!canSave}
                      onClick={() => setEditing({ draft: lessonToDraft(l), originalId: l.id })}
                      aria-label="Edit"
                    >
                      ✎
                    </button>
                    <button className="icon-button danger" disabled={!canSave} onClick={() => remove(l)} aria-label="Delete">
                      🗑
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </section>
  )
}

function Generator({
  apiKey,
  existingTitles,
  onDraft,
}: {
  apiKey: string
  existingTitles: string[]
  onDraft: (lesson: Lesson) => void
}) {
  const [instrument, setInstrument] = useState<InstrumentId>('piano')
  const [level, setLevel] = useState(1)
  const [request, setRequest] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!apiKey) {
    return (
      <div className="panel">
        <h2>✨ Generate with Claude</h2>
        <p className="muted">Add a Claude API key under Keys to generate lessons.</p>
      </div>
    )
  }

  const generate = async () => {
    setBusy(true)
    setError('')
    try {
      onDraft(await generateLesson(apiKey, instrument, level, request, existingTitles))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t generate a lesson.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h2>✨ Generate with Claude</h2>
      <div className="form-grid">
        <label>
          Instrument
          <select value={instrument} onChange={(e) => setInstrument(e.target.value as InstrumentId)}>
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            <option value={1}>1 – first week</option>
            <option value={2}>2 – first month</option>
            <option value={3}>3 – getting comfortable</option>
          </select>
        </label>
        <label className="wide">
          What should it teach?
          <textarea
            rows={2}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="e.g. The G major chord, or Happy Birthday with the right hand"
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="button" onClick={generate} disabled={busy}>
        {busy ? 'Writing the lesson…' : 'Generate draft'}
      </button>
      <p className="muted small-text">You’ll see the draft in the editor before anything is saved.</p>
    </div>
  )
}

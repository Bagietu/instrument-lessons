import { useState } from 'react'
import { HAS_BACKEND } from '../config'
import { INSTRUMENTS, type InstrumentId } from '../instruments'
import { LESSONS } from '../lessons/data'
import { lessonsFor, useLessons } from '../lessons/store'
import type { Lesson } from '../lessons/types'
import { href } from '../router'
import { AdminError, adminApi } from './api'
import { lessonToDraft, newDraft, type Draft } from './draft'
import { LessonEditor } from './LessonEditor'

const PASSWORD_KEY = 'instrument-lessons:admin-password'

function readSaved(): string {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) ?? ''
  } catch {
    return ''
  }
}

export function AdminPage() {
  const [password, setPassword] = useState(readSaved)
  const [loggedIn, setLoggedIn] = useState(false)
  const [canGenerate, setCanGenerate] = useState(false)

  if (!HAS_BACKEND) {
    return (
      <section>
        <h1>Admin</h1>
        <div className="panel">
          <p>The lessons database isn’t connected yet, so lessons can’t be edited.</p>
          <p className="muted">
            Follow <code>SETUP.md</code> in the repository to connect Supabase, then redeploy the site.
          </p>
        </div>
      </section>
    )
  }

  if (!loggedIn) {
    return (
      <Login
        initial={password}
        onSuccess={(pw, generate) => {
          setPassword(pw)
          setCanGenerate(generate)
          setLoggedIn(true)
          try {
            sessionStorage.setItem(PASSWORD_KEY, pw)
          } catch {
            // Not remembered; the admin logs in again next time.
          }
        }}
      />
    )
  }

  return (
    <Dashboard
      password={password}
      canGenerate={canGenerate}
      onLogout={() => {
        try {
          sessionStorage.removeItem(PASSWORD_KEY)
        } catch {
          // Nothing to clear.
        }
        setPassword('')
        setLoggedIn(false)
      }}
    />
  )
}

function Login({ initial, onSuccess }: { initial: string; onSuccess: (password: string, canGenerate: boolean) => void }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await adminApi.check(value)
      onSuccess(value, res.canGenerate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t log in.')
    } finally {
      setBusy(false)
    }
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
        <button className="button" disabled={busy || !value}>
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </section>
  )
}

type Editing = { draft: Draft; originalId: string | null } | null

function Dashboard({ password, canGenerate, onLogout }: { password: string; canGenerate: boolean; onLogout: () => void }) {
  const store = useLessons()
  const [editing, setEditing] = useState<Editing>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lessons = store.databaseLessons

  const run = async (task: () => Promise<string>) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setMessage(await task())
    } catch (err) {
      if (err instanceof AdminError && err.status === 401) onLogout()
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const save = async (lesson: Lesson, previousId: string | null) => {
    await adminApi.save(password, lesson, previousId ?? undefined)
    await store.reload()
    setEditing(null)
    setMessage(`Saved “${lesson.title}”.`)
  }

  const remove = (lesson: Lesson) => {
    if (!window.confirm(`Delete “${lesson.title}”? This can’t be undone.`)) return
    void run(async () => {
      await adminApi.remove(password, lesson.id)
      await store.reload()
      return `Deleted “${lesson.title}”.`
    })
  }

  const move = (list: Lesson[], index: number, by: number) => {
    const other = list[index + by]
    if (!other) return
    // Renumber the whole list so positions are distinct, then swap the two.
    const order = list.map((l) => l.id)
    ;[order[index], order[index + by]] = [order[index + by], order[index]]
    void run(async () => {
      for (const [i, id] of order.entries()) {
        const lesson = list.find((l) => l.id === id)!
        if (lesson.position !== i) await adminApi.save(password, { ...lesson, position: i }, lesson.id)
      }
      await store.reload()
      return 'Order updated.'
    })
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
      {store.error && <p className="notice error">{store.error}</p>}

      {!store.loading && lessons.length === 0 && (
        <div className="panel">
          <p>
            The database has no lessons yet, so the app is showing the {LESSONS.length} built-in starter lessons. Copy them
            into the database to edit them here.
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const res = await adminApi.importLessons(password, LESSONS)
                await store.reload()
                return `Copied ${res.count} lessons.`
              })
            }
          >
            Copy starter lessons
          </button>
        </div>
      )}

      <Generator
        password={password}
        canGenerate={canGenerate}
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
              <button className="button secondary small" onClick={() => setEditing({ draft: newDraft(instrument.id), originalId: null })}>
                + New lesson
              </button>
            </div>
            {list.length === 0 && <p className="muted">No lessons in the database yet.</p>}
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
                    <button className="icon-button" disabled={busy || i === 0} onClick={() => move(list, i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button className="icon-button" disabled={busy || i === list.length - 1} onClick={() => move(list, i, 1)} aria-label="Move down">
                      ↓
                    </button>
                    <a className="icon-button" href={href(l.instrument, 'lesson', l.id)} aria-label="Try it">
                      ▶
                    </a>
                    <button className="icon-button" onClick={() => setEditing({ draft: lessonToDraft(l), originalId: l.id })} aria-label="Edit">
                      ✎
                    </button>
                    <button className="icon-button danger" disabled={busy} onClick={() => remove(l)} aria-label="Delete">
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

function Generator({ password, canGenerate, onDraft }: { password: string; canGenerate: boolean; onDraft: (lesson: Lesson) => void }) {
  const [instrument, setInstrument] = useState<InstrumentId>('piano')
  const [level, setLevel] = useState(1)
  const [request, setRequest] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!canGenerate) {
    return (
      <div className="panel">
        <h2>✨ Generate with Claude</h2>
        <p className="muted">Add a Claude API key to the server (see SETUP.md) to generate lessons.</p>
      </div>
    )
  }

  const generate = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await adminApi.generate(password, instrument, level, request)
      onDraft(res.lesson)
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

import { INSTRUMENTS, getInstrument } from './instruments'
import { AdminPage } from './admin/AdminPage'
import { lessonsFor, useLessons } from './lessons/store'
import { isCompleted } from './progress'
import { href, useRoute } from './router'
import { LessonPlayer } from './screens/LessonPlayer'
import { Tuner } from './screens/Tuner'

export default function App() {
  const [instrumentId, page, lessonId] = useRoute()
  const store = useLessons()
  const isAdmin = instrumentId === 'admin'
  const instrument = instrumentId ? getInstrument(instrumentId) : undefined
  const lesson = page === 'lesson' && lessonId ? store.lessons.find((l) => l.id === lessonId) : undefined

  return (
    <div className="app">
      <header className="topbar">
        <a href={href()} className="brand">
          🎶 Instrument Lessons
        </a>
        {isAdmin && (
          <a href={href()} className="back">
            ← App
          </a>
        )}
        {instrument && (
          <a href={page ? href(instrument.id) : href()} className="back">
            ← Back
          </a>
        )}
      </header>
      <main>
        {isAdmin && <AdminPage />}
        {!instrument && !isAdmin && <Home />}
        {instrument && !page && <InstrumentHome id={instrument.id} />}
        {instrument && page === 'tuner' && <Tuner key={instrument.id} instrument={instrument} />}
        {lesson && <LessonPlayer key={lesson.id} lesson={lesson} />}
        {instrument && page === 'lesson' && !lesson && (
          <p className="muted">{store.loading ? 'Loading lesson…' : 'This lesson doesn’t exist any more.'}</p>
        )}
      </main>
      <footer className="footer">
        <a href={href('admin')}>Admin</a>
      </footer>
    </div>
  )
}

function Home() {
  return (
    <section>
      <h1>What do you want to learn?</h1>
      <div className="cards">
        {INSTRUMENTS.map((i) => (
          <a key={i.id} href={href(i.id)} className="card">
            <span className="card-emoji">{i.emoji}</span>
            <span className="card-title">{i.name}</span>
            <span className="card-text">{i.tagline}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

function InstrumentHome({ id }: { id: string }) {
  const instrument = getInstrument(id)!
  const store = useLessons()
  return (
    <section>
      <h1>
        {instrument.emoji} {instrument.name}
      </h1>
      <div className="cards">
        <a href={href(id, 'tuner')} className="card">
          <span className="card-emoji">🎯</span>
          <span className="card-title">{id === 'voice' ? 'Pitch meter' : 'Tuner'}</span>
          <span className="card-text">
            {id === 'voice' ? 'See which note you’re singing' : 'Check the microphone hears you'}
          </span>
        </a>
      </div>

      <h2>Lessons</h2>
      <ol className="lesson-list">
        {store.loading && <li className="muted">Loading lessons…</li>}
        {lessonsFor(store.lessons, instrument.id).map((l) => (
          <li key={l.id}>
            <a href={href(id, 'lesson', l.id)} className="lesson-row">
              <span className={`lesson-status ${isCompleted(l.id) ? 'done' : ''}`}>{isCompleted(l.id) ? '✓' : ''}</span>
              <span className="lesson-text">
                <span className="lesson-title">{l.title}</span>
                <span className="lesson-desc">{l.description}</span>
              </span>
              <span className="lesson-level">Level {l.level}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

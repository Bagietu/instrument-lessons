import { AdminPage } from './admin/AdminPage'
import { FloatingNotes } from './fun/FloatingNotes'
import { INSTRUMENTS, getInstrument, type InstrumentId } from './instruments'
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
    <div className="app" data-theme={instrument?.id ?? 'home'}>
      <FloatingNotes />
      <header className="topbar">
        <a href={href()} className="brand">
          <span className="brand-icon">🎶</span> Instrument Lessons
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
          <p className="muted">This lesson doesn’t exist any more.</p>
        )}
      </main>
      <footer className="footer">
        <a href={href('admin')}>Admin</a>
        <div className="version">{__APP_VERSION__}</div>
      </footer>
    </div>
  )
}

function useProgress(instrument: InstrumentId) {
  const list = lessonsFor(useLessons().lessons, instrument)
  const done = list.filter((l) => isCompleted(l.id)).length
  return { list, done, total: list.length, percent: list.length ? (done / list.length) * 100 : 0 }
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="card-progress">
      <div className="progress" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-label">{label}</div>
    </div>
  )
}

function Home() {
  return (
    <section>
      <div className="hero">
        <span className="hero-emoji">🎸🎹🎤</span>
        <h1>Let’s make some music!</h1>
        <p>Pick an instrument. Your microphone listens and cheers you on.</p>
      </div>
      <div className="cards">
        {INSTRUMENTS.map((i) => (
          <InstrumentCard key={i.id} id={i.id} />
        ))}
      </div>
    </section>
  )
}

function InstrumentCard({ id }: { id: InstrumentId }) {
  const instrument = getInstrument(id)!
  const { done, total, percent } = useProgress(id)
  return (
    <a href={href(id)} className="card instrument" data-theme={id}>
      <span className="card-emoji">{instrument.emoji}</span>
      <span className="card-title">{instrument.name}</span>
      <span className="card-text">{instrument.tagline}</span>
      <ProgressBar percent={percent} label={done === 0 ? `${total} lessons to explore` : `${done} of ${total} done`} />
    </a>
  )
}

function InstrumentHome({ id }: { id: InstrumentId }) {
  const instrument = getInstrument(id)!
  const { list, done, total, percent } = useProgress(id)
  const nextUp = list.find((l) => !isCompleted(l.id))

  return (
    <section>
      <div className="banner">
        <span className="banner-emoji" aria-hidden="true">
          {instrument.emoji}
        </span>
        <h1>{instrument.name}</h1>
        <p>{done === total && total > 0 ? 'Every lesson done. Legend! 🏆' : instrument.tagline}</p>
        <ProgressBar percent={percent} label={`${done} of ${total} lessons done`} />
        {nextUp && (
          <div className="row left">
            <a className="button secondary" href={href(id, 'lesson', nextUp.id)}>
              {done === 0 ? '▶ Start first lesson' : `▶ Continue: ${nextUp.title}`}
            </a>
          </div>
        )}
      </div>

      <a href={href(id, 'tuner')} className="tool-link">
        <span>🎯</span>
        <span>
          {id === 'voice' ? 'Pitch meter' : 'Tuner'}
          <small>{id === 'voice' ? 'See which note you’re singing' : 'Tune up and check the mic hears you'}</small>
        </span>
      </a>

      <h2>Lessons</h2>
      <ol className="lesson-list">
        {list.map((l, index) => {
          const completed = isCompleted(l.id)
          return (
            <li key={l.id}>
              <a href={href(id, 'lesson', l.id)} className="lesson-row">
                <span className={`lesson-status ${completed ? 'done' : ''}`} aria-label={completed ? 'Done' : `Lesson ${index + 1}`}>
                  {completed ? '★' : index + 1}
                </span>
                <span className="lesson-text">
                  <span className="lesson-title">{l.title}</span>
                  <span className="lesson-desc">{l.description}</span>
                </span>
                <span className="lesson-level">Lv {l.level}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

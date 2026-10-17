import { INSTRUMENTS, getInstrument } from './instruments'
import { getLesson, lessonsFor } from './lessons/data'
import { isCompleted } from './progress'
import { href, useRoute } from './router'
import { LessonPlayer } from './screens/LessonPlayer'
import { Tuner } from './screens/Tuner'

export default function App() {
  const [instrumentId, page, lessonId] = useRoute()
  const instrument = instrumentId ? getInstrument(instrumentId) : undefined
  const lesson = page === 'lesson' && lessonId ? getLesson(lessonId) : undefined

  return (
    <div className="app">
      <header className="topbar">
        <a href={href()} className="brand">
          🎶 Instrument Lessons
        </a>
        {instrument && (
          <a href={page ? href(instrument.id) : href()} className="back">
            ← Back
          </a>
        )}
      </header>
      <main>
        {!instrument && <Home />}
        {instrument && !page && <InstrumentHome id={instrument.id} />}
        {instrument && page === 'tuner' && <Tuner key={instrument.id} instrument={instrument} />}
        {lesson && <LessonPlayer key={lesson.id} lesson={lesson} />}
      </main>
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
        {lessonsFor(instrument.id).map((l) => (
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

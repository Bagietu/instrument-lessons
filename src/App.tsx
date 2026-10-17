import { INSTRUMENTS, getInstrument } from './instruments'
import { href, useRoute } from './router'
import { Tuner } from './screens/Tuner'

export default function App() {
  const [instrumentId, page] = useRoute()
  const instrument = instrumentId ? getInstrument(instrumentId) : undefined

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
        <div className="card disabled">
          <span className="card-emoji">📚</span>
          <span className="card-title">Lessons</span>
          <span className="card-text">Coming soon</span>
        </div>
      </div>
    </section>
  )
}

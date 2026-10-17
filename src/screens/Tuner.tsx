import { useMicPitch } from '../audio/useMicPitch'
import { centsFrom, nearestNote, noteFromLabel } from '../audio/notes'
import type { Instrument } from '../instruments'
import { MicPrompt } from './MicPrompt'

const IN_TUNE_CENTS = 5

export function Tuner({ instrument }: { instrument: Instrument }) {
  const mic = useMicPitch(instrument.detect)
  const reading = mic.frequency ? nearestNote(mic.frequency) : null

  // For guitar, show how far off the closest string is rather than the closest semitone.
  const strings = instrument.referenceNotes?.map(noteFromLabel)
  const closestString =
    mic.frequency && strings
      ? strings.reduce((best, s) =>
          Math.abs(centsFrom(mic.frequency!, s)) < Math.abs(centsFrom(mic.frequency!, best)) ? s : best,
        )
      : null
  const cents = closestString
    ? Math.round(centsFrom(mic.frequency!, closestString))
    : (reading?.cents ?? 0)
  const shownLabel = closestString?.label ?? reading?.note.label
  const clamped = Math.max(-50, Math.min(50, cents))
  const inTune = mic.frequency !== null && Math.abs(cents) <= IN_TUNE_CENTS

  return (
    <section className="tuner">
      <h1>{instrument.name} tuner</h1>
      {mic.status !== 'listening' ? (
        <MicPrompt status={mic.status} onStart={mic.start} />
      ) : (
        <>
          <div className={`tuner-note ${inTune ? 'in-tune' : ''}`} aria-live="polite">
            {shownLabel ?? '–'}
          </div>
          <div className="tuner-freq">
            {mic.frequency ? `${mic.frequency.toFixed(1)} Hz` : instrument.id === 'voice' ? 'Sing a note' : 'Play a note'}
          </div>

          <div className="meter" role="meter" aria-valuemin={-50} aria-valuemax={50} aria-valuenow={cents}>
            <div className="meter-scale">
              <span>♭</span>
              <span>in tune</span>
              <span>♯</span>
            </div>
            <div className="meter-track">
              <div className="meter-center" />
              {mic.frequency && (
                <div
                  className={`meter-needle ${inTune ? 'in-tune' : ''}`}
                  style={{ left: `${50 + clamped}%` }}
                />
              )}
            </div>
            <div className="meter-hint">
              {!mic.frequency
                ? ' '
                : inTune
                  ? 'In tune!'
                  : cents < 0
                    ? `${-cents} cents flat, go up`
                    : `${cents} cents sharp, go down`}
            </div>
          </div>

          {strings && (
            <div className="strings">
              {strings.map((s) => (
                <span key={s.label} className={`string ${closestString?.label === s.label ? 'active' : ''}`}>
                  {s.label}
                </span>
              ))}
            </div>
          )}

          <div className="volume">
            <div className="volume-bar" style={{ width: `${mic.volume * 100}%` }} />
          </div>
          <button className="button secondary" onClick={mic.stop}>
            Stop listening
          </button>
        </>
      )}
    </section>
  )
}

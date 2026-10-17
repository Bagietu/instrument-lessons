import { useCallback, useEffect, useRef, useState } from 'react'
import { createFollower, type FollowerState } from '../audio/follower'
import { frequencyToMidi, noteFromLabel } from '../audio/notes'
import { playReferenceTone } from '../audio/referenceTone'
import { useMicPitch, type MicFrame, type MicPitch } from '../audio/useMicPitch'
import { getInstrument } from '../instruments'
import { lessonsFor } from '../lessons/data'
import { describePosition, guitarPosition } from '../lessons/guitar'
import type { Lesson, NotesStep } from '../lessons/types'
import { markCompleted } from '../progress'
import { href } from '../router'
import { Keyboard } from './Keyboard'
import { MicPrompt } from './MicPrompt'

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [stepIndex, setStepIndex] = useState(0)
  // One microphone for the whole lesson, so it keeps listening from step to step.
  const frameHandler = useRef<((frame: MicFrame) => void) | null>(null)
  const mic = useMicPitch(getInstrument(lesson.instrument)!.detect, (frame) => frameHandler.current?.(frame))
  const listen = useCallback((handler: ((frame: MicFrame) => void) | null) => {
    frameHandler.current = handler
  }, [])
  const step = lesson.steps[stepIndex]
  const isLast = stepIndex === lesson.steps.length - 1
  const done = stepIndex >= lesson.steps.length

  const next = () => {
    if (isLast) markCompleted(lesson.id)
    setStepIndex((i) => i + 1)
  }

  return (
    <section className="lesson">
      <div className="lesson-head">
        <h1>{lesson.title}</h1>
        <div className="step-dots" aria-label={`Step ${Math.min(stepIndex + 1, lesson.steps.length)} of ${lesson.steps.length}`}>
          {lesson.steps.map((_, i) => (
            <span key={i} className={`dot ${i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}`} />
          ))}
        </div>
      </div>

      {done ? (
        <Finished lesson={lesson} />
      ) : step.kind === 'info' ? (
        <div className="panel">
          {step.title && <h2>{step.title}</h2>}
          <p className="info-text">{step.text}</p>
          <button className="button" onClick={next}>
            {isLast ? 'Finish' : 'Got it'}
          </button>
        </div>
      ) : (
        <NotesExercise key={stepIndex} lesson={lesson} step={step} mic={mic} listen={listen} onDone={next} />
      )}
    </section>
  )
}

interface ExerciseProps {
  lesson: Lesson
  step: NotesStep
  mic: MicPitch
  /** Registers the function that receives microphone frames. */
  listen: (handler: ((frame: MicFrame) => void) | null) => void
  onDone: () => void
}

function NotesExercise({ lesson, step, mic, listen, onDone }: ExerciseProps) {
  const instrument = getInstrument(lesson.instrument)!
  const [follower] = useState(() => createFollower(step.notes, instrument.follow))
  const [state, setState] = useState<FollowerState>(follower.state)
  const [heardMidi, setHeardMidi] = useState<number | null>(null)

  const onFrame = useCallback((frame: MicFrame) => {
    const before = follower.state
    const after = follower.update(frame)
    if (after.index !== before.index || after.holdProgress !== before.holdProgress || after.cents !== before.cents) {
      setState(after)
    }
    setHeardMidi(frame.frequency ? Math.round(frequencyToMidi(frame.frequency)) : null)
  }, [follower])

  useEffect(() => {
    listen(onFrame)
    return () => listen(null)
  }, [listen, onFrame])

  if (state.finished) {
    return (
      <div className="panel center">
        <div className="big-check">✓</div>
        <p>Nice! {step.notes.length === 1 ? 'Note' : 'All notes'} played.</p>
        <button className="button" onClick={onDone}>
          Continue
        </button>
      </div>
    )
  }

  const target = step.notes[state.index]
  const targetNote = noteFromLabel(target)
  const midis = step.notes.map((n) => noteFromLabel(n).midi)
  const position = lesson.instrument === 'guitar' ? guitarPosition(target) : null
  const cents = state.cents
  const feedback =
    cents === null
      ? lesson.instrument === 'voice' ? 'Sing when ready' : 'Play when ready'
      : Math.abs(cents) <= instrument.follow.toleranceCents
        ? state.holdProgress < 1 && lesson.instrument === 'voice' ? 'That’s it, hold it…' : 'Yes!'
        : Math.abs(cents) > 250
          ? 'Not that note'
          : cents < 0
            ? 'A bit higher'
            : 'A bit lower'

  return (
    <div className="panel">
      <p className="instruction">{step.instruction}</p>

      <div className="note-strip">
        {step.notes.map((n, i) => (
          <span key={i} className={`note-chip ${i < state.index ? 'done' : i === state.index ? 'current' : ''}`}>
            <span>{noteFromLabel(n).name}</span>
            {step.hints?.[i] && <small>{step.hints[i]}</small>}
          </span>
        ))}
      </div>

      <div className="target">
        <div className="target-note">{targetNote.name}</div>
        <div className="target-sub">
          {position ? describePosition(position) : lesson.instrument === 'voice' ? 'Any octave' : targetNote.label}
        </div>
      </div>

      {lesson.instrument === 'piano' && (
        <Keyboard from={Math.min(...midis)} to={Math.max(...midis)} target={targetNote.midi} heard={heardMidi} />
      )}

      {mic.status !== 'listening' ? (
        <MicPrompt status={mic.status} onStart={mic.start} />
      ) : (
        <>
          <div className="hold">
            <div className="hold-bar" style={{ width: `${state.holdProgress * 100}%` }} />
          </div>
          <p className={`feedback ${cents !== null && Math.abs(cents) <= instrument.follow.toleranceCents ? 'good' : ''}`}>
            {feedback}
          </p>
        </>
      )}

      <div className="row">
        <button className="button secondary" onClick={() => playReferenceTone(target)}>
          🔊 Hear it
        </button>
        <button className="button secondary" onClick={() => setState(follower.skip())}>
          Skip note
        </button>
      </div>
    </div>
  )
}

function Finished({ lesson }: { lesson: Lesson }) {
  const list = lessonsFor(lesson.instrument)
  const nextLesson = list[list.findIndex((l) => l.id === lesson.id) + 1]
  return (
    <div className="panel center">
      <div className="big-check">🎉</div>
      <h2>Lesson complete!</h2>
      <div className="row">
        <a className="button secondary" href={href(lesson.instrument)}>
          All lessons
        </a>
        {nextLesson && (
          <a className="button" href={href(lesson.instrument, 'lesson', nextLesson.id)}>
            Next: {nextLesson.title}
          </a>
        )}
      </div>
    </div>
  )
}

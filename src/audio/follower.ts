import { frequencyToMidi, noteFromLabel } from './notes'

// Follows a learner through a sequence of target notes, frame by frame.
// A note counts once it has been heard close enough to the target for `holdMs`.
// The same note twice in a row (E, E) must be played twice: after a success the
// follower waits for a release (silence, another pitch, or a fresh attack).

export interface FollowerOptions {
  /** How long the right pitch must be heard, in ms. */
  holdMs: number
  /** Allowed distance from the target, in cents. */
  toleranceCents: number
  /** Accept the right note in any octave (voices differ; mics sometimes jump an octave). */
  anyOctave: boolean
}

export interface Frame {
  /** Timestamp in ms. */
  time: number
  /** Detected frequency, or null when nothing clear is heard. */
  frequency: number | null
  /** Input level 0..1. */
  volume: number
}

export interface FollowerState {
  /** Index of the note being waited for; equals notes.length when finished. */
  index: number
  /** Distance from the current target in cents (octave-folded when anyOctave), or null. */
  cents: number | null
  /** 0..1 of the hold time reached on the current note. */
  holdProgress: number
  finished: boolean
}

/** Distance in cents from `frequency` to `targetMidi`; with anyOctave, to the nearest octave of it. */
export function centsToTarget(frequency: number, targetMidi: number, anyOctave: boolean): number {
  let diff = (frequencyToMidi(frequency) - targetMidi) * 100
  if (anyOctave) diff = ((((diff + 600) % 1200) + 1200) % 1200) - 600
  return diff
}

export function createFollower(labels: string[], options: FollowerOptions) {
  const targets = labels.map((l) => noteFromLabel(l).midi)
  let index = 0
  let holdStart: number | null = null
  let armed = true
  let quietSince: number | null = null
  let lastVolume = 0
  let state: FollowerState = { index: 0, cents: null, holdProgress: 0, finished: targets.length === 0 }

  function update(frame: Frame): FollowerState {
    if (index >= targets.length) return state

    // A sharp rise in volume is a new attack (a re-struck key or string).
    const attack = frame.volume > 0.04 && frame.volume > lastVolume * 1.6
    lastVolume = lastVolume * 0.6 + frame.volume * 0.4

    const target = targets[index]
    const cents = frame.frequency ? centsToTarget(frame.frequency, target, options.anyOctave) : null
    const onTarget = cents !== null && Math.abs(cents) <= options.toleranceCents

    if (!armed) {
      // Waiting for the previous note to be released before accepting the same note again.
      if (!onTarget) {
        quietSince ??= frame.time
        if (frame.time - quietSince >= 60) armed = true
      } else {
        quietSince = null
      }
      if (attack) armed = true
    }

    if (armed && onTarget) {
      holdStart ??= frame.time
      if (frame.time - holdStart >= options.holdMs) {
        index++
        holdStart = null
        quietSince = null
        // Only a repeat of the same pitch needs a release first.
        armed = index < targets.length && targets[index] % 12 !== target % 12
      }
    } else {
      holdStart = null
    }

    const progress = holdStart === null ? 0 : Math.min(1, (frame.time - holdStart) / options.holdMs)
    state = { index, cents, holdProgress: progress, finished: index >= targets.length }
    return state
  }

  /** Moves past the current note without playing it. */
  function skip(): FollowerState {
    if (index < targets.length) index++
    holdStart = null
    armed = true
    state = { ...state, index, holdProgress: 0, finished: index >= targets.length }
    return state
  }

  return { update, skip, get state() { return state } }
}

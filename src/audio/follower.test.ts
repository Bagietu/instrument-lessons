import { describe, expect, it } from 'vitest'
import { centsToTarget, createFollower, type Frame } from './follower'
import { noteFromLabel } from './notes'

const OPTS = { holdMs: 120, toleranceCents: 50, anyOctave: false }
const STEP = 16

/** Builds frames: each entry is [note label or null for silence, duration ms, volume]. */
function frames(parts: [string | null, number, number?][]): Frame[] {
  const out: Frame[] = []
  let time = 0
  for (const [label, ms, volume = 0.3] of parts) {
    for (let t = 0; t < ms; t += STEP) {
      out.push({ time, frequency: label ? noteFromLabel(label).frequency : null, volume: label ? volume : 0 })
      time += STEP
    }
  }
  return out
}

function run(labels: string[], input: Frame[], opts = OPTS) {
  const f = createFollower(labels, opts)
  input.forEach((fr) => f.update(fr))
  return f.state
}

describe('createFollower', () => {
  it('advances through a melody', () => {
    const s = run(['C4', 'D4', 'E4'], frames([['C4', 200], ['D4', 200], ['E4', 200]]))
    expect(s.finished).toBe(true)
  })

  it('does not accept a note that is too short', () => {
    expect(run(['C4'], frames([['C4', 60]])).index).toBe(0)
  })

  it('does not accept the wrong note', () => {
    expect(run(['C4'], frames([['D4', 500]])).index).toBe(0)
  })

  it('needs a repeated note to be played twice', () => {
    expect(run(['E4', 'E4'], frames([['E4', 600]])).index).toBe(1)
    expect(run(['E4', 'E4'], frames([['E4', 200], [null, 100], ['E4', 200]])).finished).toBe(true)
  })

  it('treats a fresh attack as a repeat even without silence', () => {
    const s = run(['E4', 'E4'], frames([['E4', 200, 0.1], ['E4', 200, 0.5]]))
    expect(s.finished).toBe(true)
  })

  it('rejects the wrong octave unless anyOctave is set', () => {
    expect(run(['C4'], frames([['C3', 300]])).index).toBe(0)
    expect(run(['C4'], frames([['C3', 300]]), { ...OPTS, anyOctave: true }).finished).toBe(true)
  })

  it('can skip a note', () => {
    const f = createFollower(['C4', 'D4'], OPTS)
    f.skip()
    frames([['D4', 200]]).forEach((fr) => f.update(fr))
    expect(f.state.finished).toBe(true)
  })
})

describe('centsToTarget', () => {
  it('folds octaves when asked', () => {
    const c4 = noteFromLabel('C4').midi
    expect(Math.round(centsToTarget(noteFromLabel('C5').frequency, c4, true))).toBe(0)
    expect(Math.round(centsToTarget(noteFromLabel('C5').frequency, c4, false))).toBe(1200)
    expect(Math.round(centsToTarget(noteFromLabel('B3').frequency, c4, true))).toBe(-100)
  })
})

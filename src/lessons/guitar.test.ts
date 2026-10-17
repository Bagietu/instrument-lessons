import { describe, expect, it } from 'vitest'
import { guitarPosition } from './guitar'

describe('guitarPosition', () => {
  it.each([
    ['E2', 6, 0],
    ['G2', 6, 3],
    ['B2', 5, 2],
    ['C3', 5, 3],
    ['E3', 4, 2],
    ['G3', 3, 0],
    ['C4', 2, 1],
    ['D4', 2, 3],
    ['E4', 1, 0],
    ['G4', 1, 3],
  ])('%s is string %i fret %i', (label, string, fret) => {
    expect(guitarPosition(label)).toMatchObject({ string, fret })
  })

  it('returns null below the guitar range', () => {
    expect(guitarPosition('C2')).toBeNull()
  })
})

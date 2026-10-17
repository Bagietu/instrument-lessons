import { noteFromLabel } from '../audio/notes'
import { GUITAR_STRINGS, guitarPosition } from '../lessons/guitar'

interface Props {
  /** All notes of the step; shown faintly so the learner sees the whole pattern. */
  notes: string[]
  /** The note to play now. */
  target: string
}

/**
 * The guitar neck as you see it looking down at it while playing: thinnest string on top,
 * headstock on the left. The target note is a big dot with the finger to use.
 */
export function Fretboard({ notes, target }: Props) {
  const goal = guitarPosition(target)
  const others = notes.map(guitarPosition).filter((p) => p !== null)
  const frets = Math.max(4, ...others.map((p) => p.fret)) + 1

  const LEFT = 46
  const TOP = 16
  const FRET_W = 58
  const GAP = 22
  const width = LEFT + frets * FRET_W + 10
  const height = TOP + GAP * 5 + 34
  // Strings top to bottom: 1 (high E) … 6 (low E).
  const strings = [...GUITAR_STRINGS].reverse()
  const y = (string: number) => TOP + (string - 1) * GAP
  const x = (fret: number) => (fret === 0 ? LEFT - 18 : LEFT + (fret - 0.5) * FRET_W)

  return (
    <svg className="fretboard" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={goal ? `Guitar neck, play string ${goal.string} fret ${goal.fret}` : 'Guitar neck'}>
      <rect x={LEFT} y={TOP - 8} width={frets * FRET_W} height={GAP * 5 + 16} rx={6} className="fb-wood" />
      <rect x={LEFT - 4} y={TOP - 8} width={6} height={GAP * 5 + 16} rx={2} className="fb-nut" />
      {Array.from({ length: frets }, (_, i) => (
        <line key={i} x1={LEFT + (i + 1) * FRET_W} x2={LEFT + (i + 1) * FRET_W} y1={TOP - 8} y2={TOP + GAP * 5 + 8} className="fb-fret" />
      ))}
      {Array.from({ length: frets }, (_, i) => (
        <text key={i} x={x(i + 1)} y={height - 6} textAnchor="middle" className="fb-number">
          {i + 1}
        </text>
      ))}
      {strings.map((s) => (
        <g key={s.number}>
          <line
            x1={LEFT}
            x2={LEFT + frets * FRET_W}
            y1={y(s.number)}
            y2={y(s.number)}
            className={`fb-string ${goal?.string === s.number ? 'active' : ''}`}
            strokeWidth={0.8 + s.number * 0.35}
          />
          <text x={6} y={y(s.number) + 4} className={`fb-name ${goal?.string === s.number ? 'active' : ''}`}>
            {noteFromLabel(s.label).name}
          </text>
        </g>
      ))}
      {others.map((p, i) => (
        <circle key={i} cx={x(p.fret)} cy={y(p.string)} r={6} className="fb-ghost" />
      ))}
      {goal && (
        <g className="fb-target" key={target}>
          <circle cx={x(goal.fret)} cy={y(goal.string)} r={11} />
          <text x={x(goal.fret)} y={y(goal.string) + 4} textAnchor="middle">
            {goal.fret === 0 ? '0' : Math.min(goal.fret, 4)}
          </text>
        </g>
      )}
    </svg>
  )
}

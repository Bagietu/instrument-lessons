import { noteFromMidi } from '../audio/notes'

const BLACK = new Set([1, 3, 6, 8, 10])

interface Props {
  /** Lowest and highest MIDI notes to draw (expanded to whole octaves). */
  from: number
  to: number
  target?: number
  /** Key currently heard, if any. */
  heard?: number | null
}

/** A small piano keyboard with the target key highlighted. */
export function Keyboard({ from, to, target, heard }: Props) {
  const start = from - (from % 12)
  const end = to + (11 - (to % 12))
  const whites: number[] = []
  const blacks: number[] = []
  for (let m = start; m <= end; m++) (BLACK.has(m % 12) ? blacks : whites).push(m)

  const W = 30
  const H = 110
  const whiteIndex = (m: number) => whites.indexOf(m)
  const fill = (m: number, base: string) =>
    m === target ? 'var(--accent)' : m === heard ? 'var(--heard)' : base

  return (
    <svg className="keyboard" viewBox={`0 0 ${whites.length * W} ${H}`} role="img" aria-label="Piano keyboard">
      {whites.map((m, i) => (
        <g key={m}>
          <rect x={i * W} y={0} width={W} height={H} rx={4} fill={fill(m, 'var(--key-white)')} stroke="var(--border)" />
          {m % 12 === 0 && (
            <text x={i * W + W / 2} y={H - 10} textAnchor="middle" className="key-label">
              {noteFromMidi(m).label}
            </text>
          )}
        </g>
      ))}
      {blacks.map((m) => (
        <rect
          key={m}
          x={(whiteIndex(m - 1) + 1) * W - W * 0.32}
          y={0}
          width={W * 0.64}
          height={H * 0.62}
          rx={3}
          fill={fill(m, 'var(--key-black)')}
        />
      ))}
    </svg>
  )
}

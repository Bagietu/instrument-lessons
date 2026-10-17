import { useState } from 'react'

const COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#22c55e', '#facc15', '#3b82f6']

/** A one-off burst of confetti falling from the top of the screen. */
export function Confetti({ pieces = 80 }: { pieces?: number }) {
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      '--x': `${Math.random() * 100}%`,
      '--c': COLORS[i % COLORS.length],
      '--r': `${Math.random() * 360}deg`,
      '--d': `${1.8 + Math.random() * 1.6}s`,
      '--delay': `${Math.random() * 0.5}s`,
      '--drift': `${Math.random() * 160 - 80}px`,
    }) as React.CSSProperties),
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  )
}

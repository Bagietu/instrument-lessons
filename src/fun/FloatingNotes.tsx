import { useState } from 'react'

const SYMBOLS = ['♪', '♫', '♩', '♬', '🎵', '🎶']
const COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#22c55e', '#facc15']

/** Music notes drifting up behind the page. Purely decorative. */
export function FloatingNotes({ count = 14 }: { count?: number }) {
  const [notes] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      symbol: SYMBOLS[i % SYMBOLS.length],
      style: {
        left: `${Math.random() * 100}%`,
        '--size': `${18 + Math.random() * 26}px`,
        '--color': COLORS[i % COLORS.length],
        '--duration': `${14 + Math.random() * 14}s`,
        '--delay': `${-Math.random() * 20}s`,
        '--spin': `${Math.random() * 80 - 40}deg`,
      } as React.CSSProperties,
    })),
  )
  return (
    <div className="floating-notes" aria-hidden="true">
      {notes.map((n, i) => (
        <span key={i} style={n.style}>
          {n.symbol}
        </span>
      ))}
    </div>
  )
}

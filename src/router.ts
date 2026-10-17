import { useEffect, useState } from 'react'

// Hash-based routing so every page works on GitHub Pages without server rewrites.
// Routes look like "#/", "#/guitar", "#/guitar/tuner".

export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [parts, setParts] = useState(read)
  useEffect(() => {
    const onChange = () => setParts(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return parts
}

export function href(...parts: string[]): string {
  return `#/${parts.join('/')}`
}

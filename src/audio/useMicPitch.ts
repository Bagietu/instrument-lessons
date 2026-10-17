import { useCallback, useEffect, useRef, useState } from 'react'
import { detectPitch, rms, type DetectOptions } from './pitch'

export type MicStatus = 'idle' | 'starting' | 'listening' | 'denied' | 'unsupported' | 'error'

export interface MicPitch {
  status: MicStatus
  /** Latest smoothed frequency in Hz, or null when nothing clear is heard. */
  frequency: number | null
  /** Current input level, 0..1. */
  volume: number
  start: () => Promise<void>
  stop: () => void
}

const BUFFER_SIZE = 4096
const MIN_CLARITY = 0.85

export interface MicFrame {
  time: number
  frequency: number | null
  volume: number
}

/**
 * Listens to the microphone and reports the pitch being played or sung.
 * `onFrame` gets every analysed frame (~60 per second) without re-rendering.
 */
export function useMicPitch(options: DetectOptions = {}, onFrame?: (frame: MicFrame) => void): MicPitch {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [frequency, setFrequency] = useState<number | null>(null)
  const [volume, setVolume] = useState(0)

  const optionsRef = useRef(options)
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    optionsRef.current = options
    onFrameRef.current = onFrame
  })
  const cleanupRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    setStatus('idle')
    setFrequency(null)
    setVolume(0)
  }, [])

  const start = useCallback(async () => {
    if (cleanupRef.current) return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('starting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Processing meant for calls distorts musical notes, so turn it off.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
      return
    }

    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = BUFFER_SIZE
    source.connect(analyser)
    const buffer = new Float32Array(BUFFER_SIZE)

    let frame = 0
    let smoothed: number | null = null
    let missed = 0

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer)
      const level = Math.min(1, rms(buffer) * 4)
      setVolume(level)
      const result = detectPitch(buffer, context.sampleRate, optionsRef.current)
      if (result && result.clarity >= MIN_CLARITY) {
        missed = 0
        // Jumping more than ~a semitone means a new note: snap instead of easing.
        const jump = smoothed ? Math.abs(Math.log2(result.frequency / smoothed)) : 1
        smoothed = smoothed && jump < 0.06 ? smoothed * 0.7 + result.frequency * 0.3 : result.frequency
        setFrequency(smoothed)
      } else if (++missed > 8) {
        smoothed = null
        setFrequency(null)
      }
      onFrameRef.current?.({ time: performance.now(), frequency: missed === 0 ? smoothed : null, volume: level })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    setStatus('listening')

    cleanupRef.current = () => {
      cancelAnimationFrame(frame)
      stream.getTracks().forEach((t) => t.stop())
      void context.close()
    }
  }, [])

  useEffect(() => () => cleanupRef.current?.(), [])

  return { status, frequency, volume, start, stop }
}

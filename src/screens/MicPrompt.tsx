import type { MicStatus } from '../audio/useMicPitch'

const MESSAGES: Partial<Record<MicStatus, string>> = {
  denied: 'Microphone access was blocked. Allow it in your browser’s site settings, then try again.',
  unsupported: 'This browser can’t use the microphone. Try a recent Chrome, Edge, Firefox or Safari.',
  error: 'Couldn’t start the microphone. Check that one is connected and not used by another app.',
}

export function MicPrompt({ status, onStart }: { status: MicStatus; onStart: () => void }) {
  return (
    <div className="mic-prompt">
      <p>The app listens through your microphone to hear what you play. Nothing is recorded or sent anywhere.</p>
      {MESSAGES[status] && <p className="error">{MESSAGES[status]}</p>}
      {status !== 'unsupported' && (
        <button className="button" onClick={onStart} disabled={status === 'starting'}>
          {status === 'starting' ? 'Starting…' : '🎙️ Start listening'}
        </button>
      )}
    </div>
  )
}

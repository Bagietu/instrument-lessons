import { useState } from 'react'
import { validateLesson } from '../lessons/format'
import { playReferenceTone } from '../audio/referenceTone'
import { INSTRUMENTS, type InstrumentId } from '../instruments'
import type { Lesson } from '../lessons/types'
import { draftToInput, emptyStep, type Draft, type DraftStep } from './draft'

interface Props {
  initial: Draft
  /** The id the lesson had when opened, or null for a new lesson. */
  originalId: string | null
  takenIds: string[]
  onSave: (lesson: Lesson, previousId: string | null) => Promise<void>
  onCancel: () => void
}

export function LessonEditor({ initial, originalId, takenIds, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const setStep = (i: number, patch: Partial<DraftStep>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
  const moveStep = (i: number, by: number) =>
    setDraft((d) => {
      const steps = [...d.steps]
      const [s] = steps.splice(i, 1)
      steps.splice(Math.max(0, Math.min(steps.length, i + by)), 0, s)
      return { ...d, steps }
    })
  const removeStep = (i: number) => setDraft((d) => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }))

  const save = async () => {
    const input = draftToInput(draft)
    // New lessons get a fresh id if the title-based one is already used.
    if (!originalId && !draft.id) {
      let id = input.id
      for (let n = 2; takenIds.includes(id); n++) id = `${input.id}-${n}`
      input.id = id
    } else if (input.id !== originalId && takenIds.includes(input.id)) {
      setErrors([`Another lesson already uses the id “${input.id}”.`])
      return
    }
    const result = validateLesson(input)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    setSaving(true)
    try {
      await onSave(result.lesson, originalId)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Couldn’t save.'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="editor">
      <h2>{originalId ? 'Edit lesson' : 'New lesson'}</h2>

      <div className="form-grid">
        <label>
          Title
          <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Your first chord" />
        </label>
        <label>
          Instrument
          <select value={draft.instrument} onChange={(e) => set({ instrument: e.target.value as InstrumentId })}>
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Short description
          <input value={draft.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <label>
          Level
          <select value={draft.level} onChange={(e) => set({ level: Number(e.target.value) })}>
            <option value={1}>1 – first week</option>
            <option value={2}>2 – first month</option>
            <option value={3}>3 – getting comfortable</option>
          </select>
        </label>
        <label>
          Id <small>(used in the link)</small>
          <input value={draft.id} onChange={(e) => set({ id: e.target.value })} placeholder="made from the title" />
        </label>
      </div>

      <h3>Steps</h3>
      {draft.steps.map((s, i) => (
        <div key={i} className="step-editor">
          <div className="step-editor-head">
            <strong>
              {i + 1}. {s.kind === 'info' ? 'Explanation' : 'Play notes'}
            </strong>
            <span className="row tight">
              <button className="icon-button" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button className="icon-button" onClick={() => moveStep(i, 1)} disabled={i === draft.steps.length - 1} aria-label="Move down">
                ↓
              </button>
              <button className="icon-button danger" onClick={() => removeStep(i)} aria-label="Remove step">
                ✕
              </button>
            </span>
          </div>
          {s.kind === 'info' ? (
            <>
              <input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder="Heading (optional)" />
              <textarea rows={3} value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} placeholder="What to explain" />
            </>
          ) : (
            <>
              <input value={s.instruction} onChange={(e) => setStep(i, { instruction: e.target.value })} placeholder="Instruction, e.g. Play C, D, E going up" />
              <div className="notes-input">
                <input value={s.notesText} onChange={(e) => setStep(i, { notesText: e.target.value })} placeholder="Notes: C4 D4 E4" />
                <button
                  className="button secondary small"
                  onClick={() => {
                    s.notesText.split(/[\s,]+/).filter(Boolean).forEach((n, k) => setTimeout(() => playReferenceTone(n, 0.45), k * 450))
                  }}
                >
                  🔊
                </button>
              </div>
              <input value={s.hintsText} onChange={(e) => setStep(i, { hintsText: e.target.value })} placeholder="Hints per note (optional): 1 / 2 / 3 or Twin / kle" />
            </>
          )}
        </div>
      ))}
      <div className="row left">
        <button className="button secondary small" onClick={() => set({ steps: [...draft.steps, emptyStep('info')] })}>
          + Explanation
        </button>
        <button className="button secondary small" onClick={() => set({ steps: [...draft.steps, emptyStep('notes')] })}>
          + Notes to play
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="row left">
        <button className="button" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save lesson'}
        </button>
        <button className="button secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}

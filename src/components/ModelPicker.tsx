import { FALLBACK_MODELS, type ModelOption } from '../lib/gemini'

type Props = {
  models: ModelOption[]
  value: string
  onChange: (value: string) => void
  disabled: boolean
}

export function ModelPicker({ models, value, onChange, disabled }: Props) {
  const options: ModelOption[] =
    models.length > 0
      ? models
      : FALLBACK_MODELS.map((id) => ({ id, label: id }))
  const known = options.some((option) => option.id === value)

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>2 · Model</h2>
          <p className="hint">
            {models.length > 0
              ? 'Loaded from your key. A “pro” model reads messy handwriting better but costs more and is slower.'
              : 'Press “Test key” to load the models your key can use. Until then the usual defaults are shown.'}
          </p>
        </div>
      </div>

      <div className="key-row">
        <select className="input" value={known ? value : options[0].id} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.id}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

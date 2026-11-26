import { useState } from 'react'

type Props = {
  apiKey: string
  onKeyChange: (value: string) => void
  remember: boolean
  onRememberChange: (value: boolean) => void
  onTest: () => void
  testing: boolean
  message: string | null
  error: string | null
}

export function KeyPanel({ apiKey, onKeyChange, remember, onRememberChange, onTest, testing, message, error }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>1 · Your Google AI Studio key</h2>
          <p className="hint">
            The key is used only by this page, sent only to Google, and never uploaded anywhere. Get one at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>
            .
          </p>
        </div>
      </div>

      <div className="key-row">
        <input
          className="input mono"
          dir="ltr"
          type={visible ? 'text' : 'password'}
          value={apiKey}
          onChange={(event) => onKeyChange(event.target.value)}
          placeholder="AQ.…"
          autoComplete="off"
          spellCheck={false}
          aria-label="Google Gemini API key"
        />
        <button type="button" className="ghost" onClick={() => setVisible((value) => !value)}>
          {visible ? 'Hide' : 'Show'}
        </button>
        <button type="button" className="ghost" onClick={onTest} disabled={testing || apiKey.trim().length < 8}>
          {testing ? 'Testing…' : 'Test key'}
        </button>
      </div>

      <label className="check">
        <input type="checkbox" checked={remember} onChange={(event) => onRememberChange(event.target.checked)} />
        Remember this key on this device
      </label>

      {message && <p className="note note--ok">{message}</p>}
      {error && <p className="note note--error">{error}</p>}
    </section>
  )
}

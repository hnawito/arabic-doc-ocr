import { useState, type FormEvent } from 'react'
import { verifyCredentials } from '../lib/auth'

type Props = { onSuccess: () => void }

export function LoginScreen({ onSuccess }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (checking) return
    setChecking(true)
    setError(null)
    try {
      if (await verifyCredentials(username, password)) {
        onSuccess()
        return
      }
      setError('Wrong user name or password.')
      setPassword('')
    } catch {
      setError('Sign-in is not available in this browser.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="hint">Enter the user name and password to open the OCR workspace.</p>

        <label className="login-field">
          <span>User name</span>
          <input
            className="input"
            dir="ltr"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            spellCheck={false}
          />
        </label>

        <label className="login-field">
          <span>Password</span>
          <input
            className="input"
            dir="ltr"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className="note note--error">{error}</p>}

        <button type="submit" className="primary login-submit" disabled={checking || !username || !password}>
          {checking ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

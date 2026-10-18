import { useState, type FormEvent } from 'react'
import { Activity, LockKeyhole, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { ApiError } from '../api'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Unable to sign in. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="AegisOps overview">
        <div className="brand-lockup">
          <span className="brand-mark"><Activity size={21} aria-hidden="true" /></span>
          <span>AegisOps <span className="brand-ai">AI</span></span>
        </div>
        <div className="login-story-copy">
          <span className="eyebrow"><span className="status-dot" /> Operations control</span>
          <h1>Clarity when systems get noisy.</h1>
          <p>One operational view for incident ownership, impact and resolution progress.</p>
        </div>
        <div className="login-assurance">
          <ShieldCheck size={17} aria-hidden="true" /> Access is managed by your AegisOps administrator
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <span className="eyebrow login-eyebrow"><LockKeyhole size={14} aria-hidden="true" /> Secure workspace</span>
        <h2 id="login-title">Sign in</h2>
        <p className="login-panel-intro">Use your provisioned AegisOps account.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={320}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              maxLength={1024}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>
          {error && <p id="login-error" className="inline-error" role="alert">{error}</p>}
          <button className="primary-button login-submit" type="submit" disabled={submitting || !email || !password}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="account-access">
          <UserRoundPlus size={17} aria-hidden="true" />
          <p><span>Need an account?</span><strong>Contact your AegisOps administrator.</strong></p>
        </div>
      </section>
    </main>
  )
}
import { useState, type FormEvent } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth/useAuth'
import type { IncidentCreate, Severity } from '../types'

export function CreateIncidentPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('Medium')
  const [category, setCategory] = useState('')
  const [assignee, setAssignee] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (user?.role === 'Viewer') return <div className="page-error" role="alert">Your role cannot create incidents.</div>

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setError('')
    setSaving(true)
    const incident: IncidentCreate = {
      title: title.trim(),
      description: description.trim(),
      severity,
      category: category.trim(),
      assignee: assignee.trim() || null,
    }
    try {
      const created = await api.createIncident(incident, token)
      navigate(`/incidents/${created.id}`)
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Could not create the incident. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack narrow-page">
      <Link className="back-link" to="/incidents"><ArrowLeft size={15} aria-hidden="true" /> Back to incidents</Link>
      <section className="page-heading compact-heading"><div><span className="eyebrow page-eyebrow">Intake</span><h1>New incident</h1><p>Capture the impact and route ownership.</p></div></section>
      <form className="surface-panel incident-form" onSubmit={handleSubmit}>
        {error && <div className="page-error" role="alert">{error}</div>}
        <div className="form-field"><label htmlFor="incident-title">Title <span className="required-mark">*</span></label><input id="incident-title" required minLength={1} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="form-field"><label htmlFor="incident-description">Description <span className="required-mark">*</span></label><textarea id="incident-description" required maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} /><small>Include affected service, observed impact and relevant timing.</small></div>
        <div className="form-grid-two">
          <div className="form-field"><label htmlFor="incident-severity">Severity <span className="required-mark">*</span></label><select id="incident-severity" value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
          <div className="form-field"><label htmlFor="incident-category">Category <span className="required-mark">*</span></label><input id="incident-category" required maxLength={100} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Network" /></div>
        </div>
        <div className="form-field"><label htmlFor="incident-assignee">Assignee</label><input id="incident-assignee" maxLength={200} value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Email or team name" /></div>
        <div className="form-actions"><Link className="secondary-button" to="/incidents">Cancel</Link><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Creating…' : <><Save size={15} aria-hidden="true" /> Create incident</>}</button></div>
      </form>
    </div>
  )
}
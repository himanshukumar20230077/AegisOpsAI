import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, CircleCheck, Save } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth/useAuth'
import { IncidentStatusBadge, SeverityBadge } from '../components/IncidentStatusBadge'
import type { Incident, IncidentStatus, Severity } from '../types'

function canManage(role: string | undefined) {
  return role === 'Admin' || role === 'Support Engineer'
}

export function IncidentDetailPage() {
  const { incidentId } = useParams()
  const { token, user } = useAuth()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [assignee, setAssignee] = useState('')
  const [severity, setSeverity] = useState<Severity>('Medium')
  const [status, setStatus] = useState<IncidentStatus>('Open')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const managementAllowed = canManage(user?.role)

  useEffect(() => {
    if (!token || !incidentId) return
    let current = true
    api.incident(Number(incidentId), token)
      .then((record) => {
        if (!current) return
        setIncident(record)
        setTitle(record.title)
        setDescription(record.description)
        setCategory(record.category)
        setAssignee(record.assignee ?? '')
        setSeverity(record.severity)
        setStatus(record.status)
      })
      .catch((caughtError: unknown) => { if (current) setError(caughtError instanceof ApiError ? caughtError.message : 'Could not load this incident.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token, incidentId])

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !incident) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await api.updateIncident(incident.id, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        assignee: assignee.trim() || null,
        severity,
        status,
      }, token)
      setIncident(updated)
      setNotice('Incident changes saved.')
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function resolveIncident() {
    if (!token || !incident) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const resolved = await api.resolveIncident(incident.id, token)
      setIncident(resolved)
      setStatus(resolved.status)
      setNotice('Incident marked resolved.')
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Could not resolve this incident.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="loading-state" role="status">Loading incident…</p>
  if (!incident) return <div className="page-stack"><Link className="back-link" to="/incidents"><ArrowLeft size={15} aria-hidden="true" /> Back to incidents</Link><div className="page-error" role="alert">{error || 'Incident not found.'}</div></div>

  return (
    <div className="page-stack narrow-page">
      <Link className="back-link" to="/incidents"><ArrowLeft size={15} aria-hidden="true" /> Back to incidents</Link>
      <section className="page-heading detail-heading"><div><span className="eyebrow page-eyebrow">INC-{String(incident.id).padStart(4, '0')} · {incident.category}</span><h1>{incident.title}</h1><div className="detail-badges"><SeverityBadge severity={incident.severity} /><IncidentStatusBadge status={incident.status} /></div></div></section>
      {error && <div className="page-error" role="alert">{error}</div>}
      {notice && <div className="success-note" role="status"><CircleCheck size={16} aria-hidden="true" />{notice}</div>}
      <form className="surface-panel incident-form" onSubmit={saveChanges}>
        <div className="panel-heading"><div><span className="section-kicker">Incident record</span><h2>Details and ownership</h2></div><small>Updated {new Date(incident.updated_at).toLocaleString()}</small></div>
        <fieldset disabled={!managementAllowed || saving} className="detail-fieldset">
          <div className="form-field"><label htmlFor="detail-title">Title</label><input id="detail-title" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="detail-description">Description</label><textarea id="detail-description" required maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="form-grid-two">
            <div className="form-field"><label htmlFor="detail-severity">Severity</label><select id="detail-severity" value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
            <div className="form-field"><label htmlFor="detail-status">Status</label><select id="detail-status" value={status} onChange={(event) => setStatus(event.target.value as IncidentStatus)}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select></div>
          </div>
          <div className="form-grid-two">
            <div className="form-field"><label htmlFor="detail-category">Category</label><input id="detail-category" required maxLength={100} value={category} onChange={(event) => setCategory(event.target.value)} /></div>
            <div className="form-field"><label htmlFor="detail-assignee">Assignee</label><input id="detail-assignee" maxLength={200} value={assignee} onChange={(event) => setAssignee(event.target.value)} /></div>
          </div>
        </fieldset>
        <div className="detail-meta"><span>Created <time dateTime={incident.created_at}>{new Date(incident.created_at).toLocaleString()}</time></span><span>Assignee <strong>{incident.assignee || 'Unassigned'}</strong></span></div>
        <div className="form-actions">
          {managementAllowed && <>
            <button className="secondary-button" type="submit" disabled={saving}><Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}</button>
            {incident.status !== 'Resolved' && incident.status !== 'Closed' && <button className="primary-button" type="button" disabled={saving} onClick={() => void resolveIncident()}><Check size={15} aria-hidden="true" /> Resolve</button>}
          </>}
          {!managementAllowed && <p className="readonly-note">Viewer access · read only</p>}
        </div>
      </form>
    </div>
  )
}
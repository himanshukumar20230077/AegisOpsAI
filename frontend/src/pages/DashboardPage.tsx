import { useEffect, useState } from 'react'
import { ArrowRight, CircleAlert, Clock3, Layers3, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth/useAuth'
import { IncidentStatusBadge, SeverityBadge } from '../components/IncidentStatusBadge'
import type { Incident, Severity } from '../types'

const severityOrder: Severity[] = ['Critical', 'High', 'Medium', 'Low']
const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function DashboardPage() {
  const { token } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let current = true
    api.listIncidents({ limit: 100, offset: 0 }, token)
      .then((records) => {
        if (current) {
          setIncidents(records)
          setError('')
        }
      })
      .catch((caughtError: unknown) => {
        if (current) setError(caughtError instanceof ApiError ? caughtError.message : 'Could not load incident data.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token])

  const activeCount = incidents.filter((item) => item.status === 'Open' || item.status === 'In Progress').length
  const criticalCount = incidents.filter((item) => item.severity === 'Critical' && item.status !== 'Resolved' && item.status !== 'Closed').length
  const inProgressCount = incidents.filter((item) => item.status === 'In Progress').length
  const severityCounts = severityOrder.map((severity) => ({
    severity,
    count: incidents.filter((item) => item.severity === severity).length,
  }))
  const maxSeverity = Math.max(1, ...severityCounts.map((entry) => entry.count))

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow page-eyebrow">Operational pulse</span>
          <h1>Overview</h1>
          <p>Incident activity from the records currently available to your account.</p>
        </div>
        <Link className="text-link" to="/incidents">Open incident register <ArrowRight size={15} aria-hidden="true" /></Link>
      </section>

      {error && <div className="page-error" role="alert">{error}</div>}
      {loading ? <p className="loading-state" role="status">Loading incident data…</p> : (
        <>
          <div className="metric-grid" aria-label="Incident summary">
            <article className="metric-panel metric-primary">
              <div className="metric-label"><span>Active incidents</span><Layers3 size={17} aria-hidden="true" /></div>
              <strong>{activeCount}</strong>
              <small>Open and in progress in this result set</small>
            </article>
            <article className="metric-panel">
              <div className="metric-label"><span>Critical severity</span><CircleAlert size={17} aria-hidden="true" /></div>
              <strong>{criticalCount}</strong>
              <small>Not resolved or closed</small>
            </article>
            <article className="metric-panel">
              <div className="metric-label"><span>In progress</span><Clock3 size={17} aria-hidden="true" /></div>
              <strong>{inProgressCount}</strong>
              <small>Currently assigned work</small>
            </article>
            <article className="metric-panel metric-scope">
              <div className="metric-label"><span>Data scope</span><ShieldCheck size={17} aria-hidden="true" /></div>
              <strong>{incidents.length}</strong>
              <small>Latest records loaded, maximum 100</small>
            </article>
          </div>

          <div className="dashboard-grid">
            <section className="surface-panel severity-panel" aria-labelledby="severity-title">
              <div className="panel-heading">
                <div><span className="section-kicker">Distribution</span><h2 id="severity-title">Severity profile</h2></div>
                <span className="panel-total">{incidents.length} records</span>
              </div>
              {incidents.length === 0 ? <p className="empty-inline">No incidents are available yet.</p> : (
                <div className="severity-chart">
                  {severityCounts.map(({ severity, count }) => (
                    <div className="severity-row" key={severity}>
                      <SeverityBadge severity={severity} />
                      <div className="severity-track"><span className={`severity-fill severity-fill-${severity.toLowerCase()}`} style={{ width: `${(count / maxSeverity) * 100}%` }} /></div>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-panel recent-panel" aria-labelledby="recent-title">
              <div className="panel-heading">
                <div><span className="section-kicker">Live queue</span><h2 id="recent-title">Recent incidents</h2></div>
                <Link className="icon-link" to="/incidents" aria-label="View all incidents" title="View all incidents"><ArrowRight size={17} /></Link>
              </div>
              {incidents.length === 0 ? <p className="empty-inline">No incidents to show.</p> : (
                <ul className="recent-list">
                  {incidents.slice(0, 5).map((incident) => (
                    <li key={incident.id}>
                      <Link to={`/incidents/${incident.id}`}>
                        <span className="recent-main"><strong>{incident.title}</strong><small>INC-{String(incident.id).padStart(4, '0')} · {incident.category}</small></span>
                        <span className="recent-meta"><SeverityBadge severity={incident.severity} /><IncidentStatusBadge status={incident.status} /><time dateTime={incident.updated_at}>{dateFormatter.format(new Date(incident.updated_at))}</time></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="panel-footer-link" to="/incidents">View incident register <ArrowRight size={14} aria-hidden="true" /></Link>
            </section>
          </div>
          <p className="data-scope-note">Dashboard figures use the latest 100 records returned by the incident API. They are not organization-wide aggregates.</p>
        </>
      )}
    </div>
  )
}
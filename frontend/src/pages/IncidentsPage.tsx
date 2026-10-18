import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useAuth } from '../auth/useAuth'
import { IncidentStatusBadge, SeverityBadge } from '../components/IncidentStatusBadge'
import type { Incident, IncidentStatus, Severity } from '../types'

const pageSize = 10

export function IncidentsPage() {
  const { token, user } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('')
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let current = true
    api.listIncidents({ limit: 100, offset: 0, status: statusFilter || undefined, severity: severityFilter || undefined }, token)
      .then((records) => {
        if (!current) return
        setIncidents(records)
        setHasMore(records.length === 100)
      })
      .catch((caughtError: unknown) => {
        if (current) setError(caughtError instanceof ApiError ? caughtError.message : 'Could not load incidents.')
      })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token, statusFilter, severityFilter])

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return incidents
    return incidents.filter((incident) => [
      incident.title,
      incident.description,
      incident.category,
      incident.assignee ?? '',
      `inc-${String(incident.id).padStart(4, '0')}`,
    ].some((value) => value.toLocaleLowerCase().includes(query)))
  }, [incidents, search])
  const pageCount = Math.max(1, Math.ceil(filteredIncidents.length / pageSize))
  const visibleIncidents = filteredIncidents.slice(page * pageSize, (page + 1) * pageSize)

  async function loadMore() {
    if (!token) return
    setLoadingMore(true)
    setError('')
    try {
      const records = await api.listIncidents({
        limit: 100,
        offset: incidents.length,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }, token)
      setIncidents((current) => [...current, ...records])
      setHasMore(records.length === 100)
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Could not load more incidents.')
    } finally {
      setLoadingMore(false)
    }
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('')
    setSeverityFilter('')
    setPage(0)
  }

  const canCreate = user?.role !== 'Viewer'

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><span className="eyebrow page-eyebrow">Operational register</span><h1>Incidents</h1><p>Review and work the incident queue.</p></div>
        {canCreate && <Link className="primary-button create-link" to="/incidents/new"><Plus size={16} aria-hidden="true" /> New incident</Link>}
      </section>

      <section className="surface-panel incident-register" aria-label="Incident register">
        <div className="register-toolbar">
          <div className="filter-control search-control">
            <Search size={16} aria-hidden="true" />
            <label className="visually-hidden" htmlFor="incident-search">Search loaded incidents</label>
            <input id="incident-search" type="search" placeholder="Search loaded records" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} />
          </div>
          <div className="filter-control select-control">
            <SlidersHorizontal size={15} aria-hidden="true" />
            <label className="visually-hidden" htmlFor="status-filter">Filter by status</label>
            <select id="status-filter" value={statusFilter} onChange={(event) => {
              setLoading(true)
              setError('')
              setIncidents([])
              setPage(0)
              setStatusFilter(event.target.value as IncidentStatus | '')
            }}>
              <option value="">All statuses</option><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option>
            </select>
          </div>
          <div className="filter-control select-control">
            <label className="visually-hidden" htmlFor="severity-filter">Filter by severity</label>
            <select id="severity-filter" value={severityFilter} onChange={(event) => {
              setLoading(true)
              setError('')
              setIncidents([])
              setPage(0)
              setSeverityFilter(event.target.value as Severity | '')
            }}>
              <option value="">All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>
          {(search || statusFilter || severityFilter) && <button className="text-button" type="button" onClick={resetFilters}>Clear</button>}
        </div>
        {error && <div className="page-error register-error" role="alert">{error}</div>}
        {loading ? <div className="table-state" role="status">Loading incidents…</div> : visibleIncidents.length === 0 ? (
          <div className="table-state empty-state"><ClipboardListEmpty /><strong>{incidents.length === 0 ? 'No incidents yet' : 'No matching incidents'}</strong><span>{incidents.length === 0 ? 'New incidents will appear here.' : 'Try changing or clearing your filters.'}</span></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col"><button className="table-sort" type="button" onClick={() => setIncidents((records) => [...records].reverse())}>Incident <ArrowDown size={13} aria-hidden="true" /></button></th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Updated</th><th scope="col"><span className="visually-hidden">Open</span></th></tr></thead>
              <tbody>
                {visibleIncidents.map((incident) => (
                  <tr key={incident.id}>
                    <td><Link className="incident-title-link" to={`/incidents/${incident.id}`}><span className="incident-id">INC-{String(incident.id).padStart(4, '0')}</span><strong>{incident.title}</strong><small>{incident.category}</small></Link></td>
                    <td><SeverityBadge severity={incident.severity} /></td>
                    <td><IncidentStatusBadge status={incident.status} /></td>
                    <td>{incident.assignee || <span className="muted-value">Unassigned</span>}</td>
                    <td><time className="table-date" dateTime={incident.updated_at}>{new Date(incident.updated_at).toLocaleDateString()}</time></td>
                    <td><Link className="row-action" to={`/incidents/${incident.id}`} aria-label={`Open ${incident.title}`}><ChevronRight size={17} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="table-footer">
          <span>Search covers loaded records ({incidents.length}); API filters are server-side.</span>
          <div className="pagination-controls">
            <span>Page {page + 1} of {pageCount}</span>
            <button className="icon-button" type="button" aria-label="Previous page" title="Previous page" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft size={16} /></button>
            <button className="icon-button" type="button" aria-label="Next page" title="Next page" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}><ChevronRight size={16} /></button>
          </div>
        </footer>
        {hasMore && <button className="load-more" type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Loading…' : 'Load next 100 records'}</button>}
      </section>
    </div>
  )
}

function ClipboardListEmpty() {
  return <ArrowUpDown className="empty-icon" size={25} aria-hidden="true" />
}
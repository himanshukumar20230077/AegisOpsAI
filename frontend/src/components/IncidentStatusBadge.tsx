import type { IncidentStatus, Severity } from '../types'

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`severity-badge severity-${severity.toLowerCase()}`}><span />{severity}</span>
}
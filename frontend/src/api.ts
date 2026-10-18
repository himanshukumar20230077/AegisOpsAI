import type {
  Incident,
  IncidentCreate,
  IncidentQuery,
  IncidentUpdate,
  LoginResult,
  User,
} from './types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const body = payload as { detail?: unknown } | null
    const detail = body?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((issue) => String(issue.msg ?? 'Invalid request')).join('; ')
          : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return payload as T
}

export const api = {
  login(email: string, password: string): Promise<LoginResult> {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  logout(token: string): Promise<void> {
    return request('/api/v1/auth/logout', { method: 'POST' }, token)
  },

  currentUser(token: string): Promise<User> {
    return request('/api/v1/auth/me', {}, token)
  },

  listIncidents(query: IncidentQuery, token: string): Promise<Incident[]> {
    const params = new URLSearchParams()
    if (query.offset !== undefined) params.set('offset', String(query.offset))
    if (query.limit !== undefined) params.set('limit', String(query.limit))
    if (query.severity) params.set('severity', query.severity)
    if (query.status) params.set('status', query.status)
    const suffix = params.size ? `?${params.toString()}` : ''
    return request(`/api/v1/incidents${suffix}`, {}, token)
  },

  incident(incidentId: number, token: string): Promise<Incident> {
    return request(`/api/v1/incidents/${incidentId}`, {}, token)
  },

  createIncident(data: IncidentCreate, token: string): Promise<Incident> {
    return request(
      '/api/v1/incidents',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    )
  },

  updateIncident(
    incidentId: number,
    data: IncidentUpdate,
    token: string,
  ): Promise<Incident> {
    return request(
      `/api/v1/incidents/${incidentId}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token,
    )
  },

  resolveIncident(incidentId: number, token: string): Promise<Incident> {
    return request(
      `/api/v1/incidents/${incidentId}/resolve`,
      { method: 'POST' },
      token,
    )
  },
}
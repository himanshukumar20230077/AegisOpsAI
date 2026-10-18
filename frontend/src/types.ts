export type UserRole = 'Admin' | 'Support Engineer' | 'Viewer'

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical'

export type IncidentStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'

export interface User {
  id: number
  email: string
  display_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface LoginResult {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface Incident {
  id: number
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  category: string
  assignee: string | null
  created_at: string
  updated_at: string
}

export interface IncidentCreate {
  title: string
  description: string
  severity: Severity
  category: string
  assignee?: string | null
  status?: IncidentStatus
}

export interface IncidentUpdate {
  title?: string
  description?: string
  severity?: Severity
  status?: IncidentStatus
  category?: string
  assignee?: string | null
}

export interface IncidentQuery {
  offset?: number
  limit?: number
  severity?: Severity
  status?: IncidentStatus
}
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import type { Incident } from '../types'
import { DashboardPage } from './DashboardPage'

const incidents: Incident[] = [
  {
    id: 7, title: 'Critical sign-in failure', description: 'Authentication requests fail.',
    severity: 'Critical', status: 'Open', category: 'Identity', assignee: 'Avery',
    created_at: '2026-10-17T10:00:00Z', updated_at: '2026-10-17T10:20:00Z',
  },
  {
    id: 8, title: 'Slow reporting export', description: 'Exports are delayed.',
    severity: 'High', status: 'In Progress', category: 'Application', assignee: 'Casey',
    created_at: '2026-10-17T09:00:00Z', updated_at: '2026-10-17T10:10:00Z',
  },
  {
    id: 9, title: 'Resolved printer queue', description: 'Queue was restarted.',
    severity: 'Low', status: 'Resolved', category: 'Workplace', assignee: null,
    created_at: '2026-10-17T08:00:00Z', updated_at: '2026-10-17T09:10:00Z',
  },
]

const context: AuthContextValue = {
  token: 'dashboard-token',
  user: {
    id: 1, email: 'viewer@example.com', display_name: 'Riley Viewer', role: 'Viewer',
    is_active: true, created_at: '2026-10-17T08:00:00Z',
  },
  login: vi.fn(), logout: vi.fn(),
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listIncidents').mockResolvedValue(incidents)
  })

  it('calculates summary and severity distribution from API records', async () => {
    render(
      <AuthContext.Provider value={context}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </AuthContext.Provider>,
    )

    const metrics = await screen.findByLabelText('Incident summary')
    const cards = metrics.querySelectorAll('.metric-panel')
    expect(cards[0]).toHaveTextContent('Active incidents2')
    expect(cards[1]).toHaveTextContent('Critical severity1')
    expect(cards[2]).toHaveTextContent('In progress1')
    expect(cards[3]).toHaveTextContent('Data scope3')
    expect(within(screen.getByRole('region', { name: 'Severity profile' })).getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Critical sign-in failure')).toBeInTheDocument()
    expect(api.listIncidents).toHaveBeenCalledWith({ limit: 100, offset: 0 }, 'dashboard-token')
  })
})
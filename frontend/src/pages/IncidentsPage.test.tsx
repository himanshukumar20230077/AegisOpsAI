import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import type { Incident } from '../types'
import { IncidentsPage } from './IncidentsPage'

const mockUser = {
  id: 1,
  email: 'engineer@example.com',
  display_name: 'Casey Engineer',
  role: 'Support Engineer' as const,
  is_active: true,
  created_at: '2026-10-17T12:00:00Z',
}

const incidents: Incident[] = [
  {
    id: 14,
    title: 'Payments API latency',
    description: 'Latency is elevated in the primary region.',
    severity: 'High',
    status: 'In Progress',
    category: 'Application',
    assignee: 'Casey Engineer',
    created_at: '2026-10-17T11:00:00Z',
    updated_at: '2026-10-17T12:00:00Z',
  },
  {
    id: 13,
    title: 'VPN certificate expiry',
    description: 'Renew the remote-access certificate.',
    severity: 'Medium',
    status: 'Open',
    category: 'Network',
    assignee: null,
    created_at: '2026-10-17T10:00:00Z',
    updated_at: '2026-10-17T10:30:00Z',
  },
]

const contextValue: AuthContextValue = {
  token: 'test-token',
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
}

function renderIncidents() {
  return render(
    <AuthContext.Provider value={contextValue}>
      <MemoryRouter><IncidentsPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('IncidentsPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'listIncidents').mockResolvedValue(incidents)
  })

  it('loads records and filters by local search', async () => {
    const user = userEvent.setup()
    renderIncidents()

    expect(await screen.findByText('Payments API latency')).toBeInTheDocument()
    expect(screen.getByText('VPN certificate expiry')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search loaded incidents' }), 'VPN')

    expect(screen.getByText('VPN certificate expiry')).toBeInTheDocument()
    expect(screen.queryByText('Payments API latency')).not.toBeInTheDocument()
  })

  it('uses the backend status filter and exposes request failures', async () => {
    const user = userEvent.setup()
    renderIncidents()
    await screen.findByText('Payments API latency')
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'Open')

    await waitFor(() =>
      expect(api.listIncidents).toHaveBeenLastCalledWith(
        { limit: 100, offset: 0, status: 'Open', severity: undefined },
        'test-token',
      ),
    )
  })
})
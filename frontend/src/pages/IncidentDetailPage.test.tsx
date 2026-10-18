import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import type { Incident } from '../types'
import { IncidentDetailPage } from './IncidentDetailPage'

const incident: Incident = {
  id: 51,
  title: 'Identity provider disruption',
  description: 'Several applications cannot authenticate users.',
  severity: 'High',
  status: 'Open',
  category: 'Identity',
  assignee: 'Casey Engineer',
  created_at: '2026-10-17T10:00:00Z',
  updated_at: '2026-10-17T10:30:00Z',
}

const context: AuthContextValue = {
  token: 'engineer-token',
  user: {
    id: 3,
    email: 'casey@example.com',
    display_name: 'Casey Engineer',
    role: 'Support Engineer',
    is_active: true,
    created_at: '2026-10-17T09:00:00Z',
  },
  login: vi.fn(),
  logout: vi.fn(),
}

function renderDetail() {
  return render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={['/incidents/51']}>
        <Routes>
          <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('IncidentDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'incident').mockResolvedValue(incident)
    vi.spyOn(api, 'updateIncident').mockResolvedValue({ ...incident, title: 'Updated identity incident' })
    vi.spyOn(api, 'resolveIncident').mockResolvedValue({ ...incident, status: 'Resolved' })
  })

  it('loads incident data and submits edits through the backend update endpoint', async () => {
    renderDetail()
    const titleInput = await screen.findByLabelText('Title')
    fireEvent.change(titleInput, { target: { value: 'Updated identity incident' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'In Progress' } })
    fireEvent.submit(screen.getByRole('button', { name: /Save changes/ }).closest('form')!)

    await waitFor(() =>
      expect(api.updateIncident).toHaveBeenCalledWith(
        51,
        expect.objectContaining({
          title: 'Updated identity incident',
          status: 'In Progress',
          severity: 'High',
        }),
        'engineer-token',
      ),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Incident changes saved')
  })

  it('uses the dedicated resolve endpoint', async () => {
    renderDetail()
    await screen.findByDisplayValue('Identity provider disruption')
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))

    await waitFor(() =>
      expect(api.resolveIncident).toHaveBeenCalledWith(51, 'engineer-token'),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Incident marked resolved')
  })
})
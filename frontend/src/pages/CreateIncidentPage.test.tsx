import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import type { Incident } from '../types'
import { CreateIncidentPage } from './CreateIncidentPage'

const mockUser = {
  id: 1,
  email: 'admin@example.com',
  display_name: 'Avery Admin',
  role: 'Admin' as const,
  is_active: true,
  created_at: '2026-10-17T12:00:00Z',
}

const contextValue: AuthContextValue = {
  token: 'admin-token', user: mockUser, login: vi.fn(), logout: vi.fn(),
}

const createdIncident: Incident = {
  id: 42,
  title: 'New incident title',
  description: 'Users cannot access the service.',
  severity: 'High',
  status: 'Open',
  category: 'Application',
  assignee: null,
  created_at: '2026-10-17T12:00:00Z',
  updated_at: '2026-10-17T12:00:00Z',
}

function renderCreatePage() {
  return render(
    <AuthContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={['/incidents/new']}>
        <Routes>
          <Route path="/incidents/new" element={<CreateIncidentPage />} />
          <Route path="/incidents/:incidentId" element={<p>Incident detail route</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('CreateIncidentPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'createIncident').mockResolvedValue(createdIncident)
  })

  it('submits a validated incident and navigates to its detail', async () => {
    renderCreatePage()
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'New incident title' } })
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Users cannot access the service.' } })
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'Application' } })
    fireEvent.change(screen.getByLabelText(/Severity/), { target: { value: 'High' } })
    fireEvent.submit(screen.getByRole('button', { name: /Create incident/ }).closest('form')!)

    await waitFor(() =>
      expect(api.createIncident).toHaveBeenCalledWith(
        {
          title: 'New incident title',
          description: 'Users cannot access the service.',
          severity: 'High',
          category: 'Application',
          assignee: null,
        },
        'admin-token',
      ),
    )
    expect(await screen.findByText('Incident detail route')).toBeInTheDocument()
  })

  it('shows useful backend validation errors', async () => {
    vi.mocked(api.createIncident).mockRejectedValue(new ApiError('Title is required', 422))
    renderCreatePage()
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'New incident title' } })
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Users cannot access the service.' } })
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: 'Application' } })
    fireEvent.submit(screen.getByRole('button', { name: /Create incident/ }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required')
  })
})
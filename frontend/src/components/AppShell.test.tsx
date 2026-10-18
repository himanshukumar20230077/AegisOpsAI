import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import { AppShell } from './AppShell'

function renderAs(role: 'Admin' | 'Support Engineer' | 'Viewer') {
  const value: AuthContextValue = {
    token: 'role-token',
    user: {
      id: 2,
      email: 'person@example.com',
      display_name: 'Pat Person',
      role,
      is_active: true,
      created_at: '2026-10-17T12:00:00Z',
    },
    login: vi.fn(),
    logout: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route element={<AppShell />}><Route index element={<p>Dashboard content</p>} /></Route></Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppShell role-aware navigation', () => {
  it.each(['Admin', 'Support Engineer'] as const)('%s sees create navigation', (role) => {
    renderAs(role)
    expect(screen.getByRole('link', { name: /Create incident/ })).toBeInTheDocument()
  })

  it('Viewer has read navigation but no create control', () => {
    renderAs('Viewer')
    expect(screen.getByRole('link', { name: 'Incidents' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Create incident/ })).not.toBeInTheDocument()
  })
})
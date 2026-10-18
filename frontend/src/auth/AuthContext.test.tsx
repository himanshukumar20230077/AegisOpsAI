import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import type { User } from '../types'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

const user: User = {
  id: 5,
  email: 'viewer@example.com',
  display_name: 'Riley Viewer',
  role: 'Viewer',
  is_active: true,
  created_at: '2026-10-17T10:00:00Z',
}

function AuthProbe() {
  const auth = useAuth()
  return (
    <div>
      <button type="button" onClick={() => void auth.login(user.email, 'test password')}>Start session</button>
      <button type="button" onClick={() => void auth.logout()}>End session</button>
      <output>{auth.user?.role ?? 'Signed out'}</output>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.spyOn(api, 'login').mockResolvedValue({
      access_token: 'opaque-session-token',
      token_type: 'bearer',
      expires_in: 300,
    })
    vi.spyOn(api, 'currentUser').mockResolvedValue(user)
    vi.spyOn(api, 'logout').mockResolvedValue()
  })

  it('loads the role from /me and revokes the in-memory token on logout', async () => {
    const interaction = userEvent.setup()
    render(<AuthProvider><AuthProbe /></AuthProvider>)

    await interaction.click(screen.getByRole('button', { name: 'Start session' }))
    expect(await screen.findByText('Viewer')).toBeInTheDocument()
    expect(api.login).toHaveBeenCalledWith(user.email, 'test password')
    expect(api.currentUser).toHaveBeenCalledWith('opaque-session-token')

    await interaction.click(screen.getByRole('button', { name: 'End session' }))
    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument())
    expect(api.logout).toHaveBeenCalledWith('opaque-session-token')
  })
})
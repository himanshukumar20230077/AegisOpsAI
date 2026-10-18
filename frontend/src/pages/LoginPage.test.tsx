import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { AuthContext, type AuthContextValue } from '../auth/auth-context'
import { LoginPage } from './LoginPage'

const login = vi.fn<AuthContextValue['login']>()
const logout = vi.fn<AuthContextValue['logout']>()

function renderLogin() {
  return render(
    <AuthContext.Provider value={{ token: null, user: null, login, logout }}>
      <LoginPage />
    </AuthContext.Provider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    logout.mockReset()
  })

  it('submits the email and password to authentication', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText('Work email'), 'operator@example.com')
    await user.type(screen.getByLabelText('Password'), 'operator password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith('operator@example.com', 'operator password'),
    )
  })

  it('directs users without accounts to their administrator', () => {
    renderLogin()

    expect(screen.getByText('Need an account?')).toBeInTheDocument()
    expect(screen.getByText('Contact your AegisOps administrator.')).toBeInTheDocument()
  })

  it('shows a useful authentication error', async () => {
    login.mockRejectedValue(new ApiError('Invalid email or password', 401))
    renderLogin()
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'operator@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong password' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
})
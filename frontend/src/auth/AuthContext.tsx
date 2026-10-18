import {
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api'
import type { User } from '../types'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  async function login(email: string, password: string) {
    const result = await api.login(email, password)
    try {
      const currentUser = await api.currentUser(result.access_token)
      setToken(result.access_token)
      setUser(currentUser)
    } catch (error) {
      await api.logout(result.access_token).catch(() => undefined)
      throw error
    }
  }

  async function logout() {
    const activeToken = token
    setToken(null)
    setUser(null)
    if (activeToken) await api.logout(activeToken).catch(() => undefined)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
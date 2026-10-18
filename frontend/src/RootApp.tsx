import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { AppShell } from './components/AppShell'
import { CreateIncidentPage } from './pages/CreateIncidentPage'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { LoginPage } from './pages/LoginPage'

function IncidentDetailRoute() {
  const { incidentId } = useParams()
  return <IncidentDetailPage key={incidentId} />
}

function AuthenticatedApp() {
  const { token, user } = useAuth()

  if (!token || !user) return <LoginPage />
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/new" element={<CreateIncidentPage />} />
          <Route path="incidents/:incidentId" element={<IncidentDetailRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function RootApp() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
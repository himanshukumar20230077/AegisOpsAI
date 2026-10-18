import { useState } from 'react'
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import type { UserRole } from '../types'

function canManage(role: UserRole) {
  return role === 'Admin' || role === 'Support Engineer'
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  if (!user) return null
  const managementAllowed = canManage(user.role)
  const pageTitle = location.pathname.startsWith('/incidents/new')
    ? 'New incident'
    : location.pathname.startsWith('/incidents/')
      ? 'Incident details'
      : location.pathname.startsWith('/incidents')
        ? 'Incidents'
        : 'Overview'
  const initials = user.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  return (
    <div className="app-frame">
      {mobileNavOpen && (
        <button
          className="mobile-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileNav}
        />
      )}
      <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Activity size={19} aria-hidden="true" /></span>
          <span>AegisOps <span className="brand-ai">AI</span></span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/" end onClick={closeMobileNav}>
            <LayoutDashboard size={17} aria-hidden="true" /> Overview
          </NavLink>
          <NavLink to="/incidents" onClick={closeMobileNav}>
            <ClipboardList size={17} aria-hidden="true" /> Incidents
          </NavLink>
          {managementAllowed && (
            <NavLink to="/incidents/new" onClick={closeMobileNav}>
              <Plus size={17} aria-hidden="true" /> Create incident
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Access governed by your assigned role.</span>
          </div>
          <div className="sidebar-version">OPERATIONS / 01</div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <span className="connection-state"><span /> Session active</span>
            <div className="profile-block">
              <span className="avatar" aria-hidden="true">{initials}</span>
              <span className="profile-copy"><strong>{user.display_name}</strong><small>{user.role}</small></span>
            </div>
            <button className="icon-button signout-button" type="button" aria-label="Sign out" title="Sign out" onClick={() => void logout()}>
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="page-content" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
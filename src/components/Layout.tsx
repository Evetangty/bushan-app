import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import brandIcon from '../assets/brand-icon.png'
import brandWordmark from '../assets/brand-wordmark.png'

interface LayoutProps {
  children: ReactNode
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium ${isActive ? 'bg-primary text-[#f3ecdf]' : 'text-[#355b4a]'}`

function SewingMachineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17h18" />
      <path d="M5 17v-4h7l2 2h5v2" />
      <path d="M12 13V8h4l2 2v5" />
      <path d="M14 9h2" />
      <path d="M8 10h2" />
    </svg>
  )
}

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8 7.5l12 11" />
      <path d="M8 16.5l12-11" />
    </svg>
  )
}

function DressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4l3 2 3-2 1 3-2 2 3 9H7l3-9-2-2 1-3z" />
      <path d="M10.5 6.5h3" />
    </svg>
  )
}

export function Layout({ children }: LayoutProps) {
  const { session, signOut } = useAuth()
  const showLogout = isSupabaseConfigured && !!session
  const location = useLocation()
  const isHome = location.pathname === '/'
  const shellClass = isHome ? 'app-shell app-bg-home pb-20' : 'app-shell app-bg-collection pb-20'

  return (
    <div className={shellClass}>
      {isHome ? (
        <header className="theme-card mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card p-4 shadow">
          <h1 className="m-0 flex items-center gap-2">
            <img src={brandIcon} alt="布山手作图标" className="brand-icon h-8 w-8 rounded-md object-cover" />
            <img src={brandWordmark} alt="Stitching time" className="brand-wordmark h-8 w-auto object-contain" />
          </h1>
          {showLogout ? (
            <button
              type="button"
              className="theme-btn rounded-full px-3 py-1.5 text-sm"
              onClick={() => void signOut()}
            >
              退出登录
            </button>
          ) : null}
        </header>
      ) : null}
      <main>{children}</main>
      <nav className="theme-nav fixed inset-x-0 bottom-0 border-t backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] justify-around p-3">
          <NavLink to="/" end className={linkClass}>
            <span className="flex items-center gap-1.5">
              <SewingMachineIcon />
              <span className="nav-label">布料</span>
            </span>
          </NavLink>
          <NavLink to="/patterns" className={linkClass}>
            <span className="flex items-center gap-1.5">
              <ScissorsIcon />
              <span className="nav-label">纸样</span>
            </span>
          </NavLink>
          <NavLink to="/finished" className={linkClass}>
            <span className="flex items-center gap-1.5">
              <DressIcon />
              <span className="nav-label">成品</span>
            </span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

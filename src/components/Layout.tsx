import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabaseClient'

interface LayoutProps {
  children: ReactNode
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-gray-700'}`

export function Layout({ children }: LayoutProps) {
  const { session, signOut } = useAuth()
  const showLogout = isSupabaseConfigured && !!session

  return (
    <div className="app-shell pb-20">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card bg-white p-4 shadow">
        <h1 className="m-0 text-2xl font-semibold">🧵 布山手作</h1>
        {showLogout ? (
          <button
            type="button"
            className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
            onClick={() => void signOut()}
          >
            退出登录
          </button>
        ) : null}
      </header>
      <main>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] justify-around p-3">
          <NavLink to="/" end className={linkClass}>
            🧵 布料
          </NavLink>
          <NavLink to="/patterns" className={linkClass}>
            ✂️ 纸样
          </NavLink>
          <NavLink to="/finished" className={linkClass}>
            🧸 成品
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

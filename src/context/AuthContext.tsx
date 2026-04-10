/* eslint-disable react-refresh/only-export-components -- context + provider 同文件 */
import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export type AuthContextValue = {
  session: Session | null
  authLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  useCloud: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false)
      return
    }

    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session: next } }) => {
      if (!cancelled) {
        setSession(next)
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authLoading,
      useCloud: isSupabaseConfigured && !!session,
      signInWithEmail: async (email, password) => {
        if (!supabase) return { error: new Error('未配置 Supabase') }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error ? new Error(error.message) : null }
      },
      signUpWithEmail: async (email, password) => {
        if (!supabase) return { error: new Error('未配置 Supabase') }
        const { error } = await supabase.auth.signUp({ email, password })
        return { error: error ? new Error(error.message) : null }
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut()
      },
    }),
    [session, authLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

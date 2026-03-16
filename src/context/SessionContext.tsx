'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, Role } from '@/types'

interface SessionContextValue {
  session: Session | null
  setSession: (session: Session | null) => void
  logout: () => void
  isParent: boolean
  isNena: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

const SESSION_KEY = 'rutines_session'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      try {
        setSessionState(JSON.parse(stored))
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setMounted(true)
  }, [])

  function setSession(s: Session | null) {
    setSessionState(s)
    if (s) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  }

  function logout() {
    setSession(null)
  }

  const isParent = session?.role === 'pare' || session?.role === 'mare'
  const isNena = session?.role === 'nena'

  if (!mounted) return null

  return (
    <SessionContext.Provider value={{ session, setSession, logout, isParent, isNena }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

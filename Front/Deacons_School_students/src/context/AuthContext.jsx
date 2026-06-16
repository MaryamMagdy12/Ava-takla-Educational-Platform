/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authApi.getSession())
  const [loading, setLoading] = useState(false)
  const [sessionVerifying, setSessionVerifying] = useState(() => Boolean(authApi.getSession()?.token))

  useEffect(() => {
    if (!authApi.getSession()?.token) {
      setSessionVerifying(false)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      try {
        const next = await authApi.fetchMe()
        if (!cancelled) setSession(next)
      } catch {
        if (!cancelled) {
          await authApi.logout()
          setSession(null)
        }
      } finally {
        if (!cancelled) setSessionVerifying(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (studentId, password) => {
    setLoading(true)
    try {
      const nextSession = await authApi.login(studentId, password)
      setSession(nextSession)
      return nextSession
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    if (!session?.student?.id) throw new Error('Not authenticated')
    await authApi.changePassword(session.student.id, currentPassword, newPassword)
    const refreshed = authApi.getSession()
    setSession(refreshed)
  }

  const logout = async () => {
    await authApi.logout()
    setSession(null)
  }

  const value = {
    session,
    student: session?.student ?? null,
    mustChangePassword: Boolean(session?.mustChangePassword),
    isAuthenticated: Boolean(session?.token),
    sessionVerifying,
    loading,
    login,
    logout,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

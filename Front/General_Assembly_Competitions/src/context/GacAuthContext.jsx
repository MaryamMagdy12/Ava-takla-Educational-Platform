import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  gacClearAuthStorage,
  gacGetMustChangePasswordStored,
  gacGetToken,
  gacGetUserStored,
  gacSetMustChangePasswordStored,
  gacSetToken,
  gacSetUserStored,
} from '../api/config.js'
import { fetchFamilyAuthMe, postFamilyLogin, postFamilyChangePassword } from '../api/familyApi.js'

const GacAuthContext = createContext(null)

function readToken() {
  return gacGetToken()
}

function readUser() {
  return gacGetUserStored()
}

function persistUser(user) {
  gacSetUserStored(user)
}

export function GacAuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => readToken())
  const [user, setUser] = useState(() => readUser())
  const [mustChangePassword, setMustChangePassword] = useState(() => gacGetMustChangePasswordStored())
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(readToken()))

  useEffect(() => {
    if (!token) {
      setUser(null)
      setIsRestoringSession(false)
      return
    }
    setIsRestoringSession(true)
    let cancelled = false
    ;(async () => {
      try {
        const session = await fetchFamilyAuthMe()
        if (cancelled) return
        if (session?.user) {
          setUser(session.user)
          persistUser(session.user)
          setMustChangePassword(session.must_change_password)
          gacSetMustChangePasswordStored(session.must_change_password)
          setIsRestoringSession(false)
          return
        }
        if (!readToken()) {
          setIsRestoringSession(false)
          return
        }
        gacClearAuthStorage()
        setToken(null)
        setUser(null)
        setMustChangePassword(false)
        setIsRestoringSession(false)
        navigate('/login', { replace: true })
      } catch {
        if (cancelled) return
        gacClearAuthStorage()
        setToken(null)
        setUser(null)
        setMustChangePassword(false)
        setIsRestoringSession(false)
        navigate('/login', { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  const login = useCallback(
    async (family_login_id, password, redirectTo = '/') => {
      gacClearAuthStorage()
      setToken(null)
      setUser(null)
      setMustChangePassword(false)
      setIsRestoringSession(false)
      const data = await postFamilyLogin(family_login_id, password)
      gacSetToken(data.token)
      gacSetMustChangePasswordStored(Boolean(data.must_change_password))
      if (data.user) {
        persistUser(data.user)
        setUser(data.user)
      } else {
        setUser(null)
      }
      setToken(data.token)
      setMustChangePassword(Boolean(data.must_change_password))
      setIsRestoringSession(false)
      const target =
        data.must_change_password ? '/change-password' : redirectTo && redirectTo !== '/login' ? redirectTo : '/'
      navigate(target, { replace: true })
    },
    [navigate],
  )

  const changePassword = useCallback(async (currentPassword, newPassword, newPasswordConfirmation) => {
    await postFamilyChangePassword(currentPassword, newPassword, newPasswordConfirmation)
    gacSetMustChangePasswordStored(false)
    setMustChangePassword(false)
    navigate('/', { replace: true })
  }, [navigate])

  const logout = useCallback(() => {
    gacClearAuthStorage()
    setToken(null)
    setUser(null)
    setMustChangePassword(false)
    setIsRestoringSession(false)
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token) && !isRestoringSession,
      isRestoringSession: Boolean(token) && isRestoringSession,
      mustChangePassword,
      login,
      logout,
      changePassword,
    }),
    [token, user, isRestoringSession, mustChangePassword, login, logout, changePassword],
  )

  return <GacAuthContext.Provider value={value}>{children}</GacAuthContext.Provider>
}

export function useGacAuth() {
  const ctx = useContext(GacAuthContext)
  if (!ctx) throw new Error('useGacAuth must be used within GacAuthProvider')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  scClearAuthStorage,
  scGetMustChangePasswordStored,
  scGetUserStored,
  scReadLearnerToken,
  scSetLearnerToken,
  scSetMustChangePasswordStored,
  scSetUserStored,
} from '../api/config.js'
import { fetchAuthMe, patchSpecialMe } from '../api/specialApi.js'
import {
  postSpecialChangePassword,
  postSpecialLogin,
  postSpecialLoginGoogle,
  postSpecialRegisterGoogle,
  postSpecialVerifyEmail,
  postSpecialVerifyLogin,
} from '../api/specialAuthApi.js'

const ScAuthContext = createContext(null)

function readToken() {
  return scReadLearnerToken()
}

function readUser() {
  return scGetUserStored()
}

function persistUser(user) {
  scSetUserStored(user)
}

function applySession(token, mustChangePassword, user) {
  scSetLearnerToken(token)
  scSetMustChangePasswordStored(mustChangePassword)
  scSetUserStored(user ?? null)
}

export function ScAuthProvider({ children }) {
  const navigate = useNavigate()
  const [token, setToken] = useState(() => readToken())
  const [user, setUser] = useState(() => readUser())
  const [mustChangePassword, setMustChangePassword] = useState(() => scGetMustChangePasswordStored())
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(readToken()))

  const finalizeSession = useCallback((data, redirectTo = '/') => {
    applySession(data.token, Boolean(data.must_change_password), data.user ?? null)
    setToken(data.token)
    setUser(data.user ?? null)
    setMustChangePassword(Boolean(data.must_change_password))
    setIsRestoringSession(false)
    const target = data.must_change_password ? '/change-password' : redirectTo
    navigate(target, { replace: true })
  }, [navigate])

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
        const session = await fetchAuthMe()
        if (cancelled) return
        if (session?.user) {
          setUser(session.user)
          persistUser(session.user)
          setMustChangePassword(session.must_change_password)
          scSetMustChangePasswordStored(session.must_change_password)
          setIsRestoringSession(false)
          return
        }
        if (!readToken()) {
          setIsRestoringSession(false)
          return
        }
        scClearAuthStorage()
        setToken(null)
        setUser(null)
        setMustChangePassword(false)
        setIsRestoringSession(false)
        navigate('/login', { replace: true })
      } catch {
        if (cancelled) return
        scClearAuthStorage()
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
    async (email, password, redirectTo = '/') => {
      scClearAuthStorage()
      setToken(null)
      setUser(null)
      setMustChangePassword(false)
      setIsRestoringSession(false)
      const data = await postSpecialLogin(email, password)
      if (data?.requiresOtp) {
        return { requiresOtp: true, email: data.email, from: redirectTo }
      }
      finalizeSession(data, redirectTo)
      return null
    },
    [finalizeSession],
  )

  const loginWithGoogle = useCallback(
    async (credential, redirectTo = '/') => {
      scClearAuthStorage()
      setToken(null)
      setUser(null)
      setMustChangePassword(false)
      setIsRestoringSession(false)
      const data = await postSpecialLoginGoogle(credential)
      if (data?.requiresOtp) {
        navigate('/verify-login', { replace: true, state: { email: data.email, from: redirectTo } })
        return { requiresOtp: true, email: data.email }
      }
      finalizeSession(data, redirectTo)
      return null
    },
    [finalizeSession, navigate],
  )

  const registerWithGoogle = useCallback(
    async (credential, profile, redirectTo = '/') => {
      scClearAuthStorage()
      setToken(null)
      setUser(null)
      setMustChangePassword(false)
      setIsRestoringSession(false)
      const data = await postSpecialRegisterGoogle(credential, profile)
      if (data?.activation_required) {
        const em = data.user?.email || ''
        navigate('/account-pending', { replace: true, state: { email: String(em).trim(), fromVerify: true } })
        return
      }
      finalizeSession(data, redirectTo)
    },
    [finalizeSession, navigate],
  )

  const verifyEmail = useCallback(
    async (email, otp, redirectTo = '/') => {
      const data = await postSpecialVerifyEmail(email, otp)
      if (data?.activation_required) {
        navigate('/account-pending', { replace: true, state: { email: email.trim(), fromVerify: true } })
        return
      }
      finalizeSession(data, redirectTo)
    },
    [finalizeSession, navigate],
  )

  const verifyLoginOtp = useCallback(
    async (email, otp, redirectTo = '/') => {
      const data = await postSpecialVerifyLogin(email, otp)
      finalizeSession(data, redirectTo)
    },
    [finalizeSession],
  )

  const changePassword = useCallback(async (currentPassword, newPassword, newPasswordConfirmation) => {
    await postSpecialChangePassword(currentPassword, newPassword, newPasswordConfirmation)
    scSetMustChangePasswordStored(false)
    setMustChangePassword(false)
    navigate('/', { replace: true })
  }, [navigate])

  const logout = useCallback(() => {
    scClearAuthStorage()
    setToken(null)
    setUser(null)
    setMustChangePassword(false)
    setIsRestoringSession(false)
    navigate('/login', { replace: true })
  }, [navigate])

  const updateProfile = useCallback(async (payload) => {
    const next = await patchSpecialMe(payload)
    setUser(next)
    persistUser(next)
    return next
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token) && !isRestoringSession,
      isRestoringSession: Boolean(token) && isRestoringSession,
      mustChangePassword,
      login,
      loginWithGoogle,
      registerWithGoogle,
      verifyEmail,
      verifyLoginOtp,
      changePassword,
      logout,
      updateProfile,
    }),
    [
      token,
      user,
      isRestoringSession,
      mustChangePassword,
      login,
      loginWithGoogle,
      registerWithGoogle,
      verifyEmail,
      verifyLoginOtp,
      changePassword,
      logout,
      updateProfile,
    ],
  )

  return <ScAuthContext.Provider value={value}>{children}</ScAuthContext.Provider>
}

export function useScAuth() {
  const ctx = useContext(ScAuthContext)
  if (!ctx) throw new Error('useScAuth must be used within ScAuthProvider')
  return ctx
}

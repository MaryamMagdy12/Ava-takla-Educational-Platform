import axios from 'axios'
import { apiClient } from './apiClient.js'
import { API_BASE } from './config.js'

function emitErrorToast(message) {
  if (!message) return
  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: {
        type: 'error',
        message,
      },
    }),
  )
}

function unwrapAxiosError(e) {
  return (
    e.response?.data?.message ||
    (e.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' ')) ||
    e.message ||
    'Request failed'
  )
}

function throwWithToast(e) {
  const message = unwrapAxiosError(e)
  emitErrorToast(message)
  throw new Error(message)
}

export async function postSpecialRegister(fields) {
  try {
    const fd = new FormData()
    fd.append('full_name', fields.full_name)
    fd.append('email', fields.email)
    fd.append('phone', fields.phone)
    fd.append('address', fields.address)
    fd.append('age', String(fields.age))
    fd.append('birth_date', fields.birth_date)
    if (fields.profile_picture instanceof File) {
      fd.append('profile_picture', fields.profile_picture)
    }
    const { data } = await axios.post(`${API_BASE}/auth/special/register`, fd, {
      headers: { Accept: 'application/json' },
      timeout: 120000,
    })
    if (!data?.success) throw new Error(data?.message || 'Registration failed')
    return data
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialVerifyEmail(email, otp) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/special/verify-email`,
      { email: email.trim(), otp },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    if (!data?.success) throw new Error(data?.message || 'Verification failed')
    const d = data.data
    if (d?.activation_required) {
      return {
        activation_required: true,
        token: null,
        must_change_password: Boolean(d.must_change_password),
        user: d.user,
      }
    }
    if (!d?.token) throw new Error(data?.message || 'Verification failed')
    return {
      activation_required: false,
      token: d.token,
      must_change_password: Boolean(d.must_change_password),
      user: d.user,
    }
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialResendVerification(email) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/special/resend-verification`,
      { email: email.trim() },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    if (!data?.success) throw new Error(data?.message || 'Request failed')
    return data
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialLogin(email, password) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/auth/special/login`,
      { email: email.trim(), password },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    if (data?.data?.requires_otp) {
      return { requiresOtp: true, email: data.data.email }
    }
    if (!data?.data?.token) throw new Error(data?.message || 'Invalid login response.')
    return data.data
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialVerifyLogin(email, otp) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/special/verify-login`,
      { email: email.trim(), otp },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    if (!data?.success || !data?.data?.token) throw new Error(data?.message || 'Verification failed')
    return data.data
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialResendLoginOtp(email) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/special/resend-login-otp`,
      { email: email.trim() },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    if (!data?.success) throw new Error(data?.message || 'Request failed')
    return data
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialLoginGoogle(credential) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/auth/special/login/google`,
      { credential },
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    if (data?.data?.requires_otp) {
      return { requiresOtp: true, email: data.data.email }
    }
    if (!data?.data?.token) throw new Error(data?.message || 'Google sign-in failed.')
    return data.data
  } catch (e) {
    throwWithToast(e)
  }
}

export async function postSpecialRegisterGoogle(credential, profile) {
  try {
    const hasFile = profile.profile_picture instanceof File
    const body = hasFile
      ? (() => {
          const fd = new FormData()
          fd.append('credential', credential)
          fd.append('full_name', profile.full_name)
          fd.append('phone', profile.phone)
          fd.append('address', profile.address)
          fd.append('age', String(profile.age))
          fd.append('birth_date', profile.birth_date)
          fd.append('profile_picture', profile.profile_picture)
          return fd
        })()
      : {
          credential,
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          age: profile.age,
          birth_date: profile.birth_date,
          ...(profile.profile_picture_url ? { profile_picture_url: profile.profile_picture_url } : {}),
        }
    const { data } = await axios.post(`${API_BASE}/auth/special/register/google`, body, {
      headers: hasFile ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: hasFile ? 120000 : 30000,
    })
    if (data?.data?.activation_required) {
      return {
        activation_required: true,
        token: null,
        must_change_password: Boolean(data.data.must_change_password),
        user: data.data.user,
      }
    }
    if (!data?.data?.token) throw new Error(data?.message || 'Google registration failed.')
    return data.data
  } catch (e) {
    throw new Error(unwrapAxiosError(e))
  }
}

export async function postSpecialChangePassword(current_password, new_password, new_password_confirmation) {
  await apiClient.post('/special/change-password', {
    current_password,
    new_password,
    new_password_confirmation,
  })
}

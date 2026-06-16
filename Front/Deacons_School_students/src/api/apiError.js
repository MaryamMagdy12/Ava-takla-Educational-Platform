function isTimeoutLikeError(error) {
  if (!error || error.response) return false
  if (error.code === 'ETIMEDOUT') return true
  const m = String(error.message || '').toLowerCase()
  if (m.includes('timeout')) return true
  if (error.code === 'ECONNABORTED' && (m.includes('exceeded') || m.includes('timeout'))) return true
  return false
}

function isNetworkFailure(error) {
  if (!error || error.response) return false
  if (isTimeoutLikeError(error)) return false
  const code = error.code
  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') return true
  const msg = String(error.message || '').toLowerCase()
  return msg.includes('network error') || msg.includes('failed to fetch') || msg.includes('networkerror')
}

const GENERIC_TIMEOUT_AR =
  'انتهت مهلة الطلب. تحقق من الاتصال أو من تشغيل الخادم ثم أعد المحاولة.'

/** @param {unknown} error */
export function getApiErrorMessage(error) {
  if (!error) return 'تعذر إكمال الطلب.'
  if (isTimeoutLikeError(error)) {
    return GENERIC_TIMEOUT_AR
  }
  if (isNetworkFailure(error)) {
    return 'تعذر الاتصال بالخادم. تأكد من تشغيل Laravel (مثلاً php artisan serve) ومن أن الملف .env في واجهة Vite يحدد VITE_API_URL إن لزم.'
  }
  const data = error.response?.data ?? error.payload
  if (typeof data?.message === 'string' && data.message) return data.message
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0]
    if (Array.isArray(first) && first[0]) return String(first[0])
    if (typeof first === 'string') return first
  }
  if (error.message && !isNetworkFailure(error)) return error.message
  return 'تعذر إكمال الطلب.'
}

import { useCallback, useEffect, useState } from 'react'
import { useScAuth } from '../context/ScAuthContext.jsx'
import ScLearnerAvatar from '../components/sc-ui/ScLearnerAvatar.jsx'
import { resolveSpecialLearnerPhotoUrl } from '../utils/specialLearnerPhoto.js'
import '../assets/css/ScProfilePage.css'

function birthInputFromUser(u) {
  const b = u?.birth_date
  if (b == null || b === '') return ''
  return String(b).slice(0, 10)
}

export default function ScProfilePage() {
  const { user, updateProfile } = useScAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [age, setAge] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const clearPendingPhoto = useCallback(() => {
    setPhotoFile(null)
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return ''
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name ?? '')
    setPhone(user.phone ?? '')
    setAddress(user.address ?? '')
    setAge(user.age != null && user.age !== '' ? String(user.age) : '')
    setBirthDate(birthInputFromUser(user))
  }, [user])

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const onPickPhoto = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setMessage('')
  }

  const displayPhotoUrl = photoPreview || resolveSpecialLearnerPhotoUrl(user)
  const displayName = user?.full_name?.trim() || 'متعلّم'

  const onCancel = () => {
    if (!user) return
    setFullName(user.full_name ?? '')
    setPhone(user.phone ?? '')
    setAddress(user.address ?? '')
    setAge(user.age != null && user.age !== '' ? String(user.age) : '')
    setBirthDate(birthInputFromUser(user))
    clearPendingPhoto()
    setEditing(false)
    setMessage('')
  }

  const onSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      if (editing) {
        await updateProfile({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          age: (() => {
            if (age === '') return null
            const n = parseInt(age, 10)
            return Number.isNaN(n) ? null : n
          })(),
          birth_date: birthDate || null,
          ...(photoFile ? { profile_picture: photoFile } : {}),
        })
        setEditing(false)
        clearPendingPhoto()
        setMessage('تم حفظ التعديلات.')
      } else if (photoFile) {
        await updateProfile({ profile_picture: photoFile })
        clearPendingPhoto()
        setMessage('تم تحديث الصورة.')
      }
    } catch (e) {
      setMessage(e.message || 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const canSavePhotoOnly = Boolean(photoFile) && !editing

  return (
    <section className="sc-profile">
      <header className="sc-profile__hero">
        <div className="sc-profile__avatar-row">
          <ScLearnerAvatar className="sc-profile__avatar" photoUrl={displayPhotoUrl} name={displayName} title={displayName} />
          <div className="sc-profile__photo-actions">
            <p className="sc-profile__photo-hint">صورة الظهور في شريط التنقل وفي قائمة المشرفين.</p>
            <input
              id="sc-profile-photo"
              className="sc-profile__file-input-hidden"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={onPickPhoto}
            />
            <label htmlFor="sc-profile-photo" className="sc-profile__btn sc-profile__btn--ghost">
              {photoFile ? 'اختيار صورة أخرى' : 'تغيير الصورة'}
            </label>
            {photoFile ? (
              <button type="button" className="sc-profile__btn sc-profile__btn--ghost" onClick={clearPendingPhoto}>
                إلغاء الصورة المختارة
              </button>
            ) : null}
          </div>
        </div>
        <h1 className="sc-profile__title">الحساب الشخصي</h1>
        <p className="sc-profile__subtitle">عرض بياناتك وتعديل الاسم والهاتف والعنوان والعمر وتاريخ الميلاد والصورة. البريد الإلكتروني للعرض فقط.</p>
      </header>

      {message ? (
        <p className="sc-profile__banner" role="status">
          {message}
        </p>
      ) : null}

      {photoFile && !editing ? (
        <p className="sc-profile__photo-pending" role="status">
          صورة جديدة جاهزة للرفع — اضغط «حفظ الصورة» أو عدّل بياناتك ثم «حفظ».
        </p>
      ) : null}

      {canSavePhotoOnly ? (
        <div className="sc-profile__photo-save-row">
          <button type="button" className="sc-profile__btn sc-profile__btn--primary" onClick={onSave} disabled={saving}>
            {saving ? 'جاري الرفع…' : 'حفظ الصورة'}
          </button>
          <button type="button" className="sc-profile__btn sc-profile__btn--ghost" onClick={clearPendingPhoto} disabled={saving}>
            إلغاء
          </button>
        </div>
      ) : null}

      <article className="sc-profile__card">
        <div className="sc-profile__card-head">
          <h2 className="sc-profile__card-title">البيانات</h2>
          {!editing ? (
            <button type="button" className="sc-profile__btn sc-profile__btn--primary" onClick={() => setEditing(true)}>
              تعديل
            </button>
          ) : (
            <div className="sc-profile__card-actions">
              <button type="button" className="sc-profile__btn sc-profile__btn--ghost" onClick={onCancel} disabled={saving}>
                إلغاء
              </button>
              <button type="button" className="sc-profile__btn sc-profile__btn--primary" onClick={onSave} disabled={saving || !fullName.trim()}>
                {saving ? 'جاري الحفظ…' : 'حفظ'}
              </button>
            </div>
          )}
        </div>

        <dl className="sc-profile__fields">
          <div className="sc-profile__row">
            <dt>البريد الإلكتروني</dt>
            <dd>
              <span className="sc-profile__readonly">{user?.email ?? '—'}</span>
            </dd>
          </div>
          <div className="sc-profile__row">
            <dt>الاسم الكامل</dt>
            <dd>
              {editing ? (
                <input
                  className="sc-profile__input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              ) : (
                <span>{user?.full_name ?? '—'}</span>
              )}
            </dd>
          </div>
          <div className="sc-profile__row">
            <dt>الهاتف</dt>
            <dd>
              {editing ? (
                <input
                  className="sc-profile__input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              ) : (
                <span>{user?.phone ?? '—'}</span>
              )}
            </dd>
          </div>
          <div className="sc-profile__row">
            <dt>العنوان</dt>
            <dd>
              {editing ? (
                <textarea className="sc-profile__textarea" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
              ) : (
                <span>{user?.address ?? '—'}</span>
              )}
            </dd>
          </div>
          <div className="sc-profile__row">
            <dt>العمر</dt>
            <dd>
              {editing ? (
                <input
                  className="sc-profile__input"
                  type="number"
                  min={0}
                  max={150}
                  inputMode="numeric"
                  placeholder="—"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              ) : (
                <span>{user?.age != null && user?.age !== '' ? user.age : '—'}</span>
              )}
            </dd>
          </div>
          <div className="sc-profile__row">
            <dt>تاريخ الميلاد</dt>
            <dd>
              {editing ? (
                <input className="sc-profile__input" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              ) : (
                <span>{birthInputFromUser(user) || '—'}</span>
              )}
            </dd>
          </div>
        </dl>
      </article>
    </section>
  )
}

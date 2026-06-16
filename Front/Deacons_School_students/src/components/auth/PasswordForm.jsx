export default function PasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  submitLabel = 'تحديث كلمة المرور',
  busy = false,
  formClassName,
  labelClassName,
  inputClassName,
  buttonClassName,
}) {
  return (
    <form onSubmit={onSubmit} className={formClassName}>
      <label className={labelClassName}>
        كلمة المرور الحالية
        <input
          className={inputClassName}
          type="password"
          value={currentPassword}
          onChange={(event) => onCurrentPasswordChange(event.target.value)}
          required
        />
      </label>
      <label className={labelClassName}>
        كلمة المرور الجديدة
        <input
          className={inputClassName}
          type="password"
          value={newPassword}
          onChange={(event) => onNewPasswordChange(event.target.value)}
          required
        />
      </label>
      <label className={labelClassName}>
        تأكيد كلمة المرور الجديدة
        <input
          className={inputClassName}
          type="password"
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          required
        />
      </label>
      <button className={buttonClassName} type="submit" disabled={busy}>
        {busy ? 'جارٍ التحديث...' : submitLabel}
      </button>
    </form>
  )
}

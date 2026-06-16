function FormCard({
  pageKey,
  title,
  onSubmit,
  children,
  submitText = "Save",
  disabled = false,
  fieldsetDisabled = disabled,
  submitDisabled = disabled,
}) {
  return (
    <form
      id={`${pageKey}-form-card`}
      className={`${pageKey}-form-card`}
      onSubmit={onSubmit}
      aria-busy={fieldsetDisabled || undefined}
    >
      <h3 className={`${pageKey}-form-card-heading`}>{title}</h3>
      <fieldset
        className={`${pageKey}-form-card-fieldset`}
        disabled={fieldsetDisabled}
        style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}
      >
        <div className={`${pageKey}-form-card-grid`}>{children}</div>
      </fieldset>
      <div className={`${pageKey}-form-card-actions`}>
        <button type="submit" className={`${pageKey}-form-card-submit`} disabled={submitDisabled}>
          {submitText}
        </button>
      </div>
    </form>
  );
}

export default FormCard;

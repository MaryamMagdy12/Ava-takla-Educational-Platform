export default function PageHeader({
  title,
  subtitle,
  extra,
  headerClassName,
  titleClassName,
  subtitleClassName,
}) {
  return (
    <header className={headerClassName}>
      <h1 className={titleClassName}>{title}</h1>
      {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
      {extra}
    </header>
  )
}

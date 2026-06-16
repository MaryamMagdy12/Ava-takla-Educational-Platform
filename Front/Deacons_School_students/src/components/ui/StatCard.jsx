export default function StatCard({ title, value, rootClassName, titleClassName, valueClassName }) {
  return (
    <article className={rootClassName}>
      <p className={titleClassName}>{title}</p>
      <p className={valueClassName}>{value}</p>
    </article>
  )
}

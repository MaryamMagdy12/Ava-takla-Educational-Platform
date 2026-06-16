export default function highlightMatch(text, query, className) {
  const safeText = text ?? ''
  const safeQuery = query?.trim()

  if (!safeQuery) return safeText

  const escaped = safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'ig')
  const parts = safeText.split(regex)

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={`${part}-${index}`} className={className}>
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQueryList(queries) {
  return [...new Set((queries || []).map((query) => String(query || "").trim()).filter(Boolean))];
}

function HighlightedText({ text, queries, className, highlightClassName }) {
  const safeText = String(text ?? "");
  const queryList = buildQueryList(queries);

  if (!safeText || queryList.length === 0) {
    return className ? <span className={className}>{safeText}</span> : safeText;
  }

  const pattern = new RegExp(`(${queryList.map(escapeRegExp).join("|")})`, "gi");
  const parts = safeText.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = queryList.some((query) => part.toLowerCase() === query.toLowerCase());
        if (!isMatch) return <span key={`${part}-${index}`}>{part}</span>;

        return (
          <mark key={`${part}-${index}`} className={highlightClassName}>
            {part}
          </mark>
        );
      })}
    </span>
  );
}

export default HighlightedText;

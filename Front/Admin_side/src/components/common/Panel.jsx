function Panel({ pageKey, variant, children }) {
  const variantClass = variant ? ` ${pageKey}-panel--${variant}` : "";
  return <div className={`${pageKey}-panel${variantClass}`}>{children}</div>;
}

export default Panel;

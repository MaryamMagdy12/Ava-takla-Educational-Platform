export default function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'ابحث...',
  selectValue,
  onSelectChange,
  options = [],
  rootClassName,
  inputClassName,
  selectClassName,
  spacerClassName,
}) {
  return (
    <div className={rootClassName}>
      {onSearchChange ? (
        <input
          className={inputClassName}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      ) : (
        <div className={spacerClassName} />
      )}
      <select className={selectClassName} value={selectValue} onChange={(event) => onSelectChange(event.target.value)}>
        <option>الكل</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

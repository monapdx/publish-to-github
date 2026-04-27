export function HtmlEditor({ value, onChange, placeholder }) {
  return (
    <textarea
      className="html-editor"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Raw HTML source"
    />
  )
}

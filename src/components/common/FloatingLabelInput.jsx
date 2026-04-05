import React from "react"
import { playBeep } from "../../lib/beep.js" // adjust the import path as needed

const FloatingLabelInput = ({
  label,
  hideLabel = false,
  type = "text",
  value,
  onChange,
  prefix,
  step,
  min,
  max,
  maxLength,
  placeholder,
  className = "",
  style,
  beep = true,  // ✅ enable typing sound by default
  ...props
}) => {
  const hasValue = value !== "" && value !== undefined && value !== null

  const handleKeyDown = (e) => {
    if (type === "number") {
      const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']
      if (allowed.includes(e.key)) { /* allow */ }
      else if (e.key === '.' && !String(value).includes('.')) { /* allow single dot */ }
      else if (e.key >= '0' && e.key <= '9') { /* allow digits */ }
      else if (e.ctrlKey || e.metaKey) { /* allow copy/paste/select-all */ }
      else { e.preventDefault(); return }
    }
    if (!beep) return
    const freq = 700 + Math.random() * 400 // 900–1100 Hz
    playBeep(freq, 7, "sine")
  }

  return (
    <div
      className={`floating-label-input ${className}`}
      style={style}
    >
      {/* ✅ Label integrated into border */}
      {!hideLabel && label && (
        <label
          className="floating-label-input__label"
        >
          {label}
        </label>
      )}

      {prefix && (
        <span className="text-cyan-400 mr-2 select-none">{prefix}</span>
      )}

      <input
        type={type}
        step={step}
        min={min}
        max={max}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown} // ✅ keypress sound
        className="floating-label-input__field"
        {...props}
      />
    </div>
  )
}

export default FloatingLabelInput

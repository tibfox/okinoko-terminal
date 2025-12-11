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
  placeholder,
  className = "",
  style,
  beep = true,  // ✅ enable typing sound by default
  ...props
}) => {
  const hasValue = value !== "" && value !== undefined && value !== null

  const handleKeyDown = () => {
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

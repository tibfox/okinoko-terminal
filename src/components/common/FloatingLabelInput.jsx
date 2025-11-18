import React from "react"
import { playBeep } from "../../lib/beep.js" // adjust the import path as needed

const FloatingLabelInput = ({
  label,
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
    if (beep) {
      playBeep(450, 25, "square")
    }
  }

  return (
    <div
      className={`floating-label-input ${className}`}
      style={style}
    >
      {/* ✅ Floating Label */}
      {label && (
        <label
          className={`absolute left-4 px-2 bg-black text-cyan-300 text-sm font-medium tracking-wide transition-all duration-200 ${
            hasValue ? "-top-3" : "-top-3"
          } pointer-events-none`}
          style={{
            transform: "translateY(-50%)",
            top: "0px",
            lineHeight: "1",
          }}
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

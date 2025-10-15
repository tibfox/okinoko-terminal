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
      className={`relative border border-cyan-400/40 rounded-md px-4 pt-4 pb-2 flex items-center focus-within:border-cyan-400 transition-all ${className}`}
      style={{
        minHeight: "50px",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        ...style,
      }}
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
        className="w-full border-none outline-none bg-transparent text-cyan-100 placeholder-cyan-700 text-base leading-relaxed relative z-10"
        {...props}
      />
    </div>
  )
}

export default FloatingLabelInput

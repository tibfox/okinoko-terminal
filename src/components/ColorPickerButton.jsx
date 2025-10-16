import { useRef, useState, useEffect } from "preact/hooks";
import {
  COLORS,
  DEFAULT_COLOR,
  setThemeColors,
  hexToHSL,
  darkenHSL,
} from "../styles/colors";
import { getColorCookie, setColorCookie } from "../lib/cookies";

export default function ColorPickerButton() {
  const inputRef = useRef(null);
  const savedColor = getColorCookie() || DEFAULT_COLOR;
  const [color, setColor] = useState(savedColor);
  const [darker, setDarker] = useState(COLORS.primaryDarker);

  useEffect(() => {
    applyThemeColors(color);
  }, []);

  const applyThemeColors = (hex) => {
    const hsl = hexToHSL(hex);
    const darkerVal = darkenHSL(hsl, 50);
    const darkestVal = darkenHSL(hsl, 70);

    // update global vars + COLORS object
    setThemeColors({
      primary: hex,
      primaryDarker: darkerVal,
      primaryDarkest: darkestVal,
    });

    // keep local copy for the icon
    setDarker(darkerVal);
  };

  const handlePick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    applyThemeColors(newColor);
    setColorCookie(newColor);
  };

  return (
    <button
      onClick={handlePick}
      title="Pick a theme color"
      style={{
        background: "none",
        border: "none",
        borderRadius: "50%",
        width: "32px",
        height: "32px",
        cursor: "pointer",
        fontSize: "1.25rem",
        fontFamily: "'Share Tech Mono', monospace",
        color, // ✅ use darker shade for gear icon
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
      }}
    >
      ⚙
      <input
        ref={inputRef}
        type="color"
        value={color}
        onInput={handleChange}
        style={{ display: "none" }}
      />
    </button>
  );
}

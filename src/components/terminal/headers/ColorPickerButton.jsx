import { useRef, useState, useEffect } from "preact/hooks";
import {
  COLORS,
  DEFAULT_COLOR,
  setThemeColors,
  hexToHSL,
  generateThemeShades,
} from "../../../styles/colors";
import { getColorCookie, setColorCookie } from "../../../lib/cookies";

export default function ColorPickerButton({ isMobile}) {
  const inputRef = useRef(null);
  const savedColor = getColorCookie() || DEFAULT_COLOR;
  const [color, setColor] = useState(savedColor);
  const [darker, setDarker] = useState(COLORS.primaryDarker);

  useEffect(() => {
    applyThemeColors(color);
  }, []);

  const applyThemeColors = (hex) => {
    const shades = generateThemeShades(hex);

    setThemeColors({
      primary: shades.primary,
      primaryLighter: shades.primaryLighter,
      primaryLightest: shades.primaryLightest,
      primaryDarker: shades.primaryDarker,
      primaryDarkest: shades.primaryDarkest,
    });

    setDarker(shades.primaryDarker);
  };

  const handlePick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    applyThemeColors(newColor);
    setColorCookie(newColor);
  };

  const colorVars = [
    "--color-primary-lightest",
    "--color-primary-lighter",
    "--color-primary",
    "--color-primary-darker",
    "--color-primary-darkest",
  ];

  return (
    <button
  onClick={handlePick}
  title="Pick a theme color"
  style={{
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <div
    style={{
      width:"1.5rem",
      height:"1.5rem",
      borderRadius: "30%",
      background: `
        conic-gradient(
          var(--color-primary-lightest) 0deg 72deg,
          var(--color-primary-lighter) 72deg 144deg,
          var(--color-primary) 144deg 216deg,
          var(--color-primary-darker) 216deg 288deg,
          var(--color-primary-darkest) 288deg 360deg
        )
      `,
      boxShadow: "0 0 4px rgba(0,0,0,0.35)",
      transition: "transform .2s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
  />

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

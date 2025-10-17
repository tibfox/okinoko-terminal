import { useRef, useState, useEffect } from "preact/hooks";
import {
  COLORS,
  DEFAULT_COLOR,
  setThemeColors,
  hexToHSL,
  generateThemeShades,
} from "../../styles/colors";
import { getColorCookie, setColorCookie } from "../../lib/cookies";

export default function ColorPickerButton() {
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
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginTop: "8px",
        }}
      >
        {colorVars.map((variable) => (
          <div
            key={variable}
            class="color-swatch"
            style={{
              width: "22px",
              height: "10px",
              borderRadius: "3px",
              background: `var(${variable})`,
              boxShadow: "0 0 2px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

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

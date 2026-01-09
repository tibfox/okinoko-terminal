import { useRef, useState, useEffect } from "preact/hooks";
import {
  COLORS,
  DEFAULT_COLOR,
  setThemeColors,
  hexToHSL,
  generateThemeShades,
} from "../../../styles/colors";
import { getColorCookie, setColorCookie } from "../../../lib/cookies";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/free-solid-svg-icons/faPalette';

export default function ColorPickerButton({ isMobile, buttonStyle = {} }) {
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



  const baseButtonStyle = {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }

  return (
    <button
      onClick={handlePick}
      title="Pick a theme color"
      style={{ ...baseButtonStyle, ...buttonStyle }}
    >
      <FontAwesomeIcon icon={faPalette}    style={{ fontSize: '0.9rem' }}  />

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

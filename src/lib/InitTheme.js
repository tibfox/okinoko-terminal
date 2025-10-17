import { getColorCookie } from "../lib/cookies";
import { hexToHSL, darkenHSL, setThemeColors } from "../styles/colors";

export function initTheme() {
  const savedColor = getColorCookie();

  // ✅ Validate cookie — must be a proper hex string like #RRGGBB or #RGB
  if (!savedColor || !/^#([0-9A-Fa-f]{3}){1,2}$/.test(savedColor)) {
    // No valid saved color → keep defaults
    return;
  }

  const hsl = hexToHSL(savedColor);
  if (!hsl || !("h" in hsl && "s" in hsl && "l" in hsl)) {
    // Fallback safeguard
    return;
  }

  // ✅ Always clamp darkening so we don't go below 10% lightness
  const darker = darkenHSL(hsl, 20);
  const darkest = darkenHSL(hsl, 60);

  // ✅ Only set values if they are defined strings
  if (darker && darkest && savedColor) {
    setThemeColors({
      primary: savedColor,
      primaryDarker: darker,
      primaryDarkest: darkest,
    });
  }
}

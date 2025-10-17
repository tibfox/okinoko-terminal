export const COLORS = {
  primary: "hsl(180, 100%, 50%)",
  primaryLighter: "hsl(180, 100%, 65%)",
  primaryLightest: "hsl(180, 100%, 85%)",
  primaryDarker: "hsl(180, 100%, 35%)",
  primaryDarkest: "hsl(180, 100%, 20%)",
  secondary: "hsl(160, 60%, 45%)",
  accent: "hsl(45, 100%, 50%)",
  background: "#f4f4f4",
  text: "#333333",
};


export const DEFAULT_COLOR = COLORS.primary;

export function setThemeColors({
  primary,
  primaryDarker,
  primaryDarkest,
  primaryLighter,
  primaryLightest,
} = {}) {
  const root = document.documentElement;

  if (primary !== undefined)
    root.style.setProperty("--color-primary", primary);

  if (primaryDarker !== undefined)
    root.style.setProperty("--color-primary-darker", primaryDarker);

  if (primaryDarkest !== undefined)
    root.style.setProperty("--color-primary-darkest", primaryDarkest);

  if (primaryLighter !== undefined)
    root.style.setProperty("--color-primary-lighter", primaryLighter);

  if (primaryLightest !== undefined)
    root.style.setProperty("--color-primary-lightest", primaryLightest);
}


// Convert hex to HSL
export function hexToHSL(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l;
  l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// export function darkenHSL({ h, s, l }, amount) {
//   if (h == null || s == null || l == null || isNaN(l)) {
//     return null; // invalid input
//   }

//   const newL = Math.max(l - amount, 10); // never darker than 10% lightness
//   return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${newL.toFixed(1)}%)`;
// }



export function generateThemeShades(hexOrHSL) {
  if (!hexOrHSL) {
    console.warn("generateThemeShades: no color provided");
    return {};
  }

  const hsl =
    typeof hexOrHSL === "string" && hexOrHSL.startsWith("#")
      ? hexToHSL(hexOrHSL)
      : hexOrHSL; // assume already an { h, s, l } object

  if (!hsl || hsl.h === undefined || hsl.s === undefined || hsl.l === undefined) {
    console.error("Invalid HSL input:", hexOrHSL);
    return {};
  }

  const { h, s } = hsl;

  return {
    primaryLightest: `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, 90%)`,
    primaryLighter: `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, 70%)`,
    primary: `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, 60%)`,
    primaryDarker: `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, 30%)`,
    primaryDarkest: `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, 15%)`,
  };
}

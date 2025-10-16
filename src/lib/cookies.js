// /src/lib/cookies.js
export function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}
export function getCookie(name) {
  const row = document.cookie.split('; ').find(r => r.startsWith(name + '='))
  return row ? decodeURIComponent(row.split('=')[1]) : null
}
export function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`
}

// src/utils/cookies.js

// --- Theme color cookie helpers ---
export function setColorCookie(color) {
  document.cookie =
    "themeColor=" +
    encodeURIComponent(color) +
    "; path=/; max-age=" + 60 * 60 * 24 * 365; // 1 year
}

export function getColorCookie() {
  const match = document.cookie.match(/themeColor=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// --- (Optional) clear cookie helper ---
export function clearColorCookie() {
  document.cookie = "themeColor=; path=/; max-age=0";
}

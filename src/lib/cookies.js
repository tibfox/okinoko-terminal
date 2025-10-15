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

import { setCookie, getCookie, deleteCookie } from './cookies.js'

const KEY = 'aioha_pending_tx'

export function savePendingTx(obj, days = 1) {
  setCookie(KEY, JSON.stringify(obj), days)
}

export function loadPendingTx() {
  const raw = getCookie(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearPendingTx() {
  deleteCookie(KEY)
}

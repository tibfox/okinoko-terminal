/**
 * Debug Console - captures all console output to sessionStorage
 * Viewable via a popup triggered by triple-tap or Ctrl+Shift+D
 */

const MAX_ENTRIES = 500
const MAX_MSG_LENGTH = 1000
const STORAGE_KEY = '__debug_logs'
const SAVE_DEBOUNCE_MS = 500

let logs = []
let listeners = new Set()
let saveTimer = null
let dirty = false

function notify() {
  const snapshot = [...logs]
  for (const fn of listeners) fn(snapshot)
}

function flushToStorage() {
  if (!dirty) return
  try {
    const json = JSON.stringify(logs)
    localStorage.setItem(STORAGE_KEY, json)
    dirty = false
  } catch {
    // Storage full — trim older half and retry once
    try {
      logs = logs.slice(-Math.floor(MAX_ENTRIES / 2))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
      dirty = false
    } catch {}
  }
}

function scheduleSave() {
  dirty = true
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    flushToStorage()
  }, SAVE_DEBOUNCE_MS)
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…[truncated]' : str
}

function addEntry(level, args) {
  const entry = {
    ts: Date.now(),
    level,
    msg: truncate(args.map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 0) } catch { return String(a) }
      }
      return String(a)
    }).join(' '), MAX_MSG_LENGTH),
  }
  logs.push(entry)
  if (logs.length > MAX_ENTRIES) logs = logs.slice(-MAX_ENTRIES)
  scheduleSave()
  notify()
}

// Restore from localStorage on load (migrate from sessionStorage if needed)
try {
  const saved = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
  if (saved) {
    logs = JSON.parse(saved)
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, saved)
    }
    sessionStorage.removeItem(STORAGE_KEY)
  }
} catch {}

// Flush logs before page unloads so nothing is lost on crash/refresh
window.addEventListener('beforeunload', flushToStorage)

// Intercept console methods
const originals = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
}

for (const [level, original] of Object.entries(originals)) {
  console[level] = (...args) => {
    addEntry(level, args)
    original.apply(console, args)
  }
}

// Capture uncaught errors — flush immediately since the page may die
window.addEventListener('error', (e) => {
  addEntry('error', [`[Uncaught] ${e.message} at ${e.filename}:${e.lineno}`])
  flushToStorage()
})
window.addEventListener('unhandledrejection', (e) => {
  addEntry('error', [`[UnhandledRejection] ${e.reason}`])
  flushToStorage()
})

export function getLogs() { return logs }
export function clearLogs() {
  logs = []
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
  notify()
}
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

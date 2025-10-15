// beep.js
let soundEnabled = true

// --- cookie helpers ---
function setCookie(name, value, days = 365) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`
}

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

// --- state controls ---
export function setSoundEnabled(value) {
  soundEnabled = value
  setCookie('soundEnabled', value ? '1' : '0')
}

export function getSoundEnabled() {
  const cookieValue = getCookie('soundEnabled')
  if (cookieValue === '0') soundEnabled = false
  if (cookieValue === '1') soundEnabled = true
  return soundEnabled
}

export function playBeep(freq = 440, dur = 80, type = 'sine') {
  if (!soundEnabled) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000)
    osc.stop(ctx.currentTime + dur / 1000)
  } catch {}
}

export const GAME_TYPE_IDS = {
  TicTacToe: 1,
  Connect4: 2,
  Gomoku: 3,
  TicTacToe5: 4,
  Squava: 5,
  GomokuFreestyle: 6,
}

export const GAME_TYPE_NAMES = Object.entries(GAME_TYPE_IDS).reduce((acc, [name, id]) => {
  acc[id] = name
  return acc
}, {})

export const GAME_TYPE_OPTIONS = Object.entries(GAME_TYPE_IDS).map(([name, id]) => ({
  id,
  name,
  label: name.replace(/([0-9]+)/g, ' $1').replace(/([a-z])([A-Z])/g, '$1 $2').trim(),
}))

export const typeNameFromId = (id) => GAME_TYPE_NAMES[id] || 'Unknown'

export const deriveGameTypeId = (fnName) => {
  if (!fnName) return null
  const trimmed = fnName.trim()
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }
  const colonIdx = trimmed.lastIndexOf(':')
  if (colonIdx !== -1) {
    const maybe = trimmed.slice(colonIdx + 1)
    if (/^\d+$/.test(maybe)) {
      return Number(maybe)
    }
  }
  return GAME_TYPE_IDS[trimmed] ?? null
}

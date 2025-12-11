export function getBoardDimensions(gameType) {
  if (!gameType) return null
  const normalized = String(gameType).trim().toLowerCase()
  if (normalized.includes('gomoku')) {
    return { rows: 15, cols: 15 }
  }
  switch (normalized) {
    case 'tictactoe':
      return { rows: 3, cols: 3 }
    case 'tictactoe5':
    case 'squava':
      return { rows: 5, cols: 5 }
    case 'connect4':
      return { rows: 6, cols: 7 }
    case 'gomoku':
    case '3': // gomoku function id
    case 'gomokofreestyle':
    case 'gomoku freestyle':
    case '6': // gomoku freestyle function id
      return { rows: 15, cols: 15 }
    default:
      return null
  }
}

export function getBoardDimensions(gameType) {
  if (!gameType) return null
  switch (gameType) {
    case 'TicTacToe':
      return { rows: 3, cols: 3 }
    case 'TicTacToe5':
    case 'Squava':
      return { rows: 5, cols: 5 }
    case 'Connect4':
      return { rows: 6, cols: 7 }
    case 'Gomoku':
      return { rows: 15, cols: 15 }
    default:
      return null
  }
}

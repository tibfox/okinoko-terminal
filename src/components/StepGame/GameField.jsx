import GameFieldBase from './GameFieldBase.jsx'
import GameFieldGomoku from './GameFieldGomoku.jsx'
import GameFieldJump from './GameFieldJump.jsx'
import GameFieldSnake from './GameFieldSnake.jsx'
import GameFieldInvaders from './GameFieldInvaders.jsx'
import GameFieldTetris from './GameFieldTetris.jsx'

// Games 2 / Yugi contract ID
const GAMES2_CONTRACT_ID = 'vsc1PLACEHOLDER_GAMES2'

export default function GameField(props) {
  // Check for Games 2 / Yugi contract single-player games
  const isGames2 = props?.contractId === GAMES2_CONTRACT_ID && !props?.game

  if (isGames2) {
    const gameTypeId = props?.defaultGameTypeId

    // Route to appropriate game component
    switch (gameTypeId) {
      case 1:
        return <GameFieldJump {...props} />
      case 2:
        return <GameFieldSnake {...props} />
      case 3:
        return <GameFieldInvaders {...props} />
      case 4:
        return <GameFieldTetris {...props} />
      default:
        // Fallback to base if unknown game type
        return <GameFieldBase {...props} />
    }
  }

  const isGomokuVariant = (() => {
    const key = String(props?.game?.type || '').trim().toLowerCase()
    if (!key) return false
    if (key.includes('gomoku')) return true
    return key === '3' || key === '6'
  })()

  if (isGomokuVariant) {
    return <GameFieldGomoku {...props} />
  }
  return <GameFieldBase {...props} />
}

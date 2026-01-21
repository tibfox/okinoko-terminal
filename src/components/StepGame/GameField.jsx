import GameFieldBase from './GameFieldBase.jsx'
import GameFieldGomoku from './GameFieldGomoku.jsx'
// Goraku games (in StepGoraku folder)
import GameFieldJump from '../StepGoraku/GameFieldJump.jsx'
import GameFieldSnakePixel from '../StepGoraku/GameFieldSnakePixel.jsx'
import GameFieldInvaders from '../StepGoraku/GameFieldInvaders.jsx'
import GameFieldTetrisPixel from '../StepGoraku/GameFieldTetrisPixel.jsx'
import YugiGameLobby from '../StepGoraku/YugiGameLobby.jsx'

// Games 2 / Yugi contract ID
const GAMES2_CONTRACT_ID = 'vsc1PLACEHOLDER_GAMES2'

export default function GameField(props) {
  // Check for Games 2 / Yugi contract single-player games
  const isGames2 = props?.contractId === GAMES2_CONTRACT_ID && !props?.game

  if (isGames2) {
    const gameTypeId = props?.defaultGameTypeId
    const { yugiView, setYugiView } = props

    // Show lobby first, then game when Insert Coin transaction succeeds
    if (yugiView === 'lobby') {
      return (
        <YugiGameLobby
          gameTypeId={gameTypeId}
          gameDescription={props?.gameDescription}
          onStartGame={() => setYugiView('game')}
        />
      )
    }

    // Route to appropriate game component
    switch (gameTypeId) {
      case 1:
        return <GameFieldJump {...props} />
      case 2:
        return <GameFieldSnakePixel {...props} />
      case 3:
        return <GameFieldInvaders {...props} />
      case 4:
        return <GameFieldTetrisPixel {...props} />
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

import GameFieldBase from './GameFieldBase.jsx'
import GameFieldGomoku from './GameFieldGomoku.jsx'

export default function GameField(props) {
  if (props?.game?.type === 'Gomoku') {
    return <GameFieldGomoku {...props} />
  }
  return <GameFieldBase {...props} />
}

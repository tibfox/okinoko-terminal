import GameFieldBase from './GameFieldBase.jsx'
import GameFieldGomoku from './GameFieldGomoku.jsx'

export default function GameField(props) {
  const isGomokuVariant = (() => {
    const key = String(props?.game?.type || '').trim().toLowerCase()
    if (!key) return false
    if (key.includes('gomoku')) return true
    return key === '3' || key === '6'
  })()

  const gameTypeKey = String(props?.game?.type || '')
    .trim()
    .toLowerCase()
  if (isGomokuVariant) {
    return <GameFieldGomoku {...props} />
  }
  return <GameFieldBase {...props} />
}

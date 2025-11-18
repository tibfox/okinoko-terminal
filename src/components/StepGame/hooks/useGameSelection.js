import { useCallback, useState } from 'preact/hooks'
import { formatMinutesAgo } from '../utils/gameTime.js'

const ensureHiveAddress = (value) => {
  if (!value) return null
  return value.startsWith('hive:') ? value : `hive:${value}`
}

export function useGameSelection({
  user,
  setParams,
  isMobile,
  onResetSelection,
  onMobilePageChange,
}) {
  const [activeGame, setActiveGame] = useState(null)
  const [displayMode, setDisplayMode] = useState(null)
  const [opponentName, setOpponentName] = useState(null)
  const [formattedAgo, setFormattedAgo] = useState(null)
  const [isMyTurn, setIsMyTurn] = useState(null)
  const [nextPlayer, setNextPlayer] = useState(null)

  const fullUser = ensureHiveAddress(user)

  const selectGame = useCallback(
    (game, mode) => {
      setDisplayMode(mode ?? null)

      if (!game) {
        setActiveGame(null)
        setFormattedAgo(null)
        setOpponentName(null)
        setIsMyTurn(null)
        return
      }

      setActiveGame(game)
      onResetSelection?.()
      setFormattedAgo(formatMinutesAgo(game.lastMoveMinutesAgo))

      const explicitNext = game.nextTurnPlayer || null
      setNextPlayer(explicitNext)

      if (fullUser) {
        let isTurn = false
        if (explicitNext) {
          isTurn = fullUser === explicitNext
        } else {
          isTurn =
            (fullUser === game.playerX && game.turn === '1') ||
            (fullUser === game.playerY && game.turn === '2')
        }
        setIsMyTurn(Boolean(isTurn))
        setOpponentName(fullUser === game.playerX ? game.playerY : game.playerX)
      } else {
        setIsMyTurn(null)
        setOpponentName(null)
      }

      if (mode === 'g_join') {
        setParams({
          __gameIntentAmount: game.bet,
          __gameIntentAsset: game.asset,
          __gameFirstMovePurchase: game.firstMovePurchase,
          __gameId: game.id,
          __gameAction: 'g_join',
        })
        if (isMobile) {
          onMobilePageChange?.('preview')
        }
      } else if (mode === 'continue') {
        setParams({
          __gameId: game.id,
          __gameAction: 'g_move',
        })
      }
    },
    [fullUser, isMobile, onResetSelection, onMobilePageChange, setParams],
  )

  const unselectGame = useCallback(() => {
    setActiveGame(null)
    setDisplayMode(null)
    setFormattedAgo(null)
    setOpponentName(null)
    setIsMyTurn(null)
    setNextPlayer(null)
    onResetSelection?.()
    if (isMobile) {
      onMobilePageChange?.('form')
    }
  }, [isMobile, onResetSelection, onMobilePageChange])

  const handleStateChange = useCallback(
    ({ playerX, playerY, hasOpponent, isMyTurn: nextTurn, nextPlayer: incomingNext }) => {
      if (!fullUser) {
        setOpponentName(null)
        setIsMyTurn(null)
        setNextPlayer(null)
        return
      }
      if (hasOpponent && playerX && playerY) {
        setOpponentName(fullUser === playerX ? playerY : playerX)
      } else if (!hasOpponent) {
        setOpponentName(null)
      }
      if (incomingNext) {
        setNextPlayer(incomingNext)
        setIsMyTurn(incomingNext === fullUser)
      } else if (typeof nextTurn === 'boolean') {
        setIsMyTurn(nextTurn)
        setNextPlayer(null)
      }
    },
    [fullUser],
  )

  return {
    activeGame,
    displayMode,
    opponentName,
    formattedAgo,
    isMyTurn,
    selectGame,
    unselectGame,
    nextPlayer,
    handleStateChange,
  }
}

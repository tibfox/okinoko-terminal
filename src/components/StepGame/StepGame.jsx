// StepGame.jsx
import { useMemo, useState, useEffect } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import { useAioha } from '@aioha/react-ui'
import GameSelect from './GameSelect.jsx'
import GameField from './GameField.jsx'
import GameJoin from './GameJoin.jsx'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import MobileTabs from '../common/MobileTabs.jsx'
import ResumedTransactionBanner from '../common/ResumedTransactionBanner.jsx'
import GameDetails from './components/GameDetails.jsx'
import ActionFooter from './components/ActionFooter.jsx'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'
import { usePendingTransaction } from './hooks/usePendingTransaction.js'
import { useGameSelection } from './hooks/useGameSelection.js'
import { deriveGameTypeId } from './gameTypes.js'
import { Tabs } from '../common/Tabs.jsx'
import { useRef } from 'preact/hooks'
import ResizableDivider from '../common/ResizableDivider.jsx'
import { getCookie, setCookie } from '../../lib/cookies.js'
import { GameSubscriptionProvider } from './providers/GameSubscriptionProvider.jsx'
import { LobbySubscriptionProvider } from './providers/LobbySubscriptionProvider.jsx'

const DIVIDER_COOKIE = 'stepGameDivider'
const SPLITTER_WIDTH_PX = 2

const clampPosition = (value, fallback = 0.5) => {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(0, num))
}

const resolveBrowseLabel = (activeGame, mode) => {
  if (!activeGame) return 'BROWSE'
  return mode === 'g_join' ? 'BROWSE' : 'INFO'
}

const resolvePreviewLabel = (activeGame, mode) => {
  if (!activeGame) return 'DETAILS'
  return mode === 'g_join' ? 'GAME INFO' : 'BOARD'
}

export default function StepGame({
  contractId,
  fnName,
  params,
  setParams,
  setStep,
}) {
  const { user } = useAioha()
  const isMobile = useDeviceBreakpoint()
  const resumedTx = usePendingTransaction()
  const [activePage, setActivePage] = useState('form')
  const [selectedCells, setSelectedCells] = useState([])
  const [swapInfo, setSwapInfo] = useState(null)
  const [shouldRedirectHome, setShouldRedirectHome] = useState(false)
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false)
  const [dividerPosition, setDividerPosition] = useState(() => {
    const saved = typeof document !== 'undefined' ? getCookie(DIVIDER_COOKIE) : null
    return clampPosition(saved, 0.5)
  })
  const [draggingDivider, setDraggingDivider] = useState(false)
  const layoutRef = useRef(null)

  const {
    activeGame,
    displayMode,
    opponentName,
    formattedAgo,
    isMyTurn,
    nextPlayer,
    selectGame,
    unselectGame,
    handleStateChange,
  } = useGameSelection({
    user,
    setParams,
    isMobile,
    onResetSelection: () => setSelectedCells([]),
    onMobilePageChange: setActivePage,
  })

  const contract = useMemo(
    () => contractsCfg.contracts.find((c) => c.vscId === contractId),
    [contractId]
  )

  const fn = useMemo(
    () => contract?.functions?.find((f) => f.name === fnName),
    [contract, fnName]
  )

  const handleTransactionSigned = (action, txid) => {
    // Clear input fields after successful game creation transaction signing
    if (action === 'g_create') {
      setParams((prev) => ({
        ...prev,
        __gameCreateName: '',
        __gameCreateBet: { amount: '', asset: 'HIVE' },
        __gameCreateFmp: 0,
        __gameFmpEnabled: false,
      }))
    }
  }

  const {
    logs,
    pending,
    waiting,
    jsonPreview,
    handleSend,
    allMandatoryFilled,
  } = useExecuteHandler({ contract, fn, params, setParams, resumedTx, onTransactionSigned: handleTransactionSigned })


  const handleMoveSelected = (cells) => {
    setSelectedCells(cells)
  }

  const handleSendMoveDummy = async () => {
    await handleSend()
  }

  const handleJoin = async () => {
    await handleSend()
  }

  const handleCreate = async () => {
    console.log('[StepGame] handleCreate called with params:', params)
    console.log('[StepGame] displayMode:', displayMode)
    await handleSend()
  }

  // const isGameMode = !!activeGame
  // const isSendEnabled = isGameMode
  //   ? selectedCells.length > 0 && !pending   // Only depend on selected cell
  //   : allMandatoryFilled && !pending         // Original behavior for non-game flow
  const isSendEnabled = displayMode === 'g_join'
    ? allMandatoryFilled && !pending && !hasInsufficientBalance
    : displayMode === 'g_create'
      ? !pending  // For create mode, button is always enabled (name and bet are optional)
      : activeGame
        ? selectedCells.length > 0 && !pending  // During active game, only need selected cells
        : allMandatoryFilled && !pending

  // Debug logging for button state
  useEffect(() => {
    if (displayMode === 'g_join') {
      console.log('[StepGame] Join button state:', {
        displayMode,
        allMandatoryFilled,
        pending,
        hasInsufficientBalance,
        isSendEnabled
      })
    }
  }, [displayMode, allMandatoryFilled, pending, hasInsufficientBalance, isSendEnabled])
  const derivedGameTypeId = useMemo(() => deriveGameTypeId(fn?.name), [fn])
  const showingGameDetails = Boolean(
    activeGame && displayMode !== 'g_join' && displayMode !== 'g_create',
  )

  const mobileTabs = useMemo(
    () => [
      {
        id: 'form',
        label: resolveBrowseLabel(activeGame, displayMode),
      },
      {
        id: 'preview',
        label: resolvePreviewLabel(activeGame, displayMode),
      },
    ],
    [activeGame, displayMode]
  )

  useEffect(() => {
    if (isMobile && activeGame) {
      setActivePage('preview')   // automatically go to the board
    }
  }, [isMobile, activeGame])

  useEffect(() => {
    if (!activeGame) {
      setSwapInfo(null)
    }
  }, [activeGame])

  useEffect(() => {
    // Reset insufficient balance state when not in join mode
    if (displayMode !== 'g_join') {
      setHasInsufficientBalance(false)
    }
  }, [displayMode])

  useEffect(() => {
    if (!contract || !fn) {
      setShouldRedirectHome(true)
    } else {
      setShouldRedirectHome(false)
    }
  }, [contract, fn])

  useEffect(() => {
    if (shouldRedirectHome) {
      setStep?.(0)
    }
  }, [shouldRedirectHome, setStep])

  useEffect(() => {
    if (typeof document === 'undefined') return
    setCookie(DIVIDER_COOKIE, dividerPosition, 30)
  }, [dividerPosition])

  useEffect(() => {
    if (!draggingDivider) return
    const handleMove = (event) => {
      const clientX = event.touches?.[0]?.clientX ?? event.clientX
      const rect = layoutRef.current?.getBoundingClientRect()
      if (!rect) return
      const relative = (clientX - rect.left) / rect.width
      const clamped = Math.min(1, Math.max(0, relative))
      const snapped = clamped < 0.06 ? 0 : clamped > 0.94 ? 1 : clamped
      setDividerPosition(snapped)
    }
    const handleUp = () => setDraggingDivider(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [draggingDivider])

  const leftCollapsed = !isMobile && dividerPosition <= 0.05
  const rightCollapsed = !isMobile && dividerPosition >= 0.95
  const leftFraction = dividerPosition
  const rightFraction = Math.max(0, 1 - dividerPosition)
  const gridTemplateColumns = isMobile
    ? '1fr'
    : leftCollapsed
      ? `0px ${SPLITTER_WIDTH_PX}px 1fr`
      : rightCollapsed
        ? `1fr ${SPLITTER_WIDTH_PX}px 0px`
        : `${leftFraction}fr ${SPLITTER_WIDTH_PX}px ${rightFraction}fr`


  return (
    <TerminalContainer title={fn?.friendlyName || fn?.name || 'Function'}
      titleOnMinimize="Function"
      backgroundColor="rgba(0, 0, 0, 0.5)"
    >
      <LobbySubscriptionProvider gameTypeId={derivedGameTypeId}>
        {isMobile && (
          <div style={{ marginBottom: '8px' }}>
            <Tabs
              tabs={mobileTabs}
              activeTab={activePage}
              onChange={setActivePage}
            />
          </div>
        )}

        <ResumedTransactionBanner tx={resumedTx} />

        <GameSubscriptionProvider gameId={activeGame?.id}>
        <div
          style={{
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : 'unset',
            gridTemplateColumns,
            gap: isMobile ? '0' : '20px',
            flex: 1,
            minHeight: 0,
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
          ref={layoutRef}
        >
        {/** Desktop keeps both columns mounted so grid columns remain stable; mobile still toggles */} 
        <div
          style={{
            display: isMobile ? (activePage === 'form' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
            minWidth: 0,
            pointerEvents: leftCollapsed ? 'none' : 'auto',
            visibility: leftCollapsed ? 'hidden' : 'visible',
          }}
        >
          {!showingGameDetails ? (
            <GameSelect
              user={user}
              contract={contract}
              fn={fn}
              params={params}
              setParams={setParams}
              pending={pending}
              onSend={handleSend}
              setStep={setStep}
              allMandatoryFilled={allMandatoryFilled}
              onGameSelected={selectGame}
              isMobile={isMobile}
            />
          ) : (
            <GameDetails
              game={activeGame}
              opponentName={opponentName}
              formattedAgo={formattedAgo}
              isMyTurn={isMyTurn}
              nextTurnPlayer={nextPlayer}
              swapInfo={swapInfo}
              onResign={handleSend}
              onTimeout={handleSend}
            />
          )}

        </div>

        {!isMobile && (
          <ResizableDivider
            leftCollapsed={leftCollapsed}
            rightCollapsed={rightCollapsed}
            onDragStart={() => setDraggingDivider(true)}
          />
        )}

        <div
          style={{
            display: isMobile ? (activePage === 'preview' ? 'flex' : 'none') : 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
            minWidth: 0,
            pointerEvents: rightCollapsed ? 'none' : 'auto',
            visibility: rightCollapsed ? 'hidden' : 'visible',
          }}
        >
          {displayMode == 'g_join' ? (
            <GameJoin
              game={activeGame}
              setParams={setParams}
              user={user}
              onBalanceCheck={setHasInsufficientBalance}
            />
          ) : (
            <GameField
              key={activeGame ? `${activeGame.id}-${activeGame.state}` : 'nogame'}
              game={activeGame}
              onSelectionChange={handleMoveSelected}
              user={user}
              setParams={setParams}
              handleResign={handleSend}
              handleTimeout={handleSend}
              isMobile={isMobile}
              onStateChange={handleStateChange}
              defaultGameTypeId={derivedGameTypeId}
              gameDescription={fn?.description}
              onExecuteAction={handleSend}
              pendingAction={pending}
              onSwapInfoChange={setSwapInfo}
            />)}
        </div>
      </div>
      </GameSubscriptionProvider>

      <ActionFooter
        displayMode={displayMode}
        pending={pending}
        isSendEnabled={isSendEnabled}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onMove={handleSendMoveDummy}
        onBackToMode={() => setStep(1)}
        onBackToGameList={unselectGame}
        showGameListButton={showingGameDetails}
      />
      </LobbySubscriptionProvider>
    </TerminalContainer>
  )
}

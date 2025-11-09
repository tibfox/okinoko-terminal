// StepGame.jsx
import { useMemo, useState } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import { useAioha } from '@aioha/react-ui'
import GameSelect from './GameSelect.jsx'
import GameField from './GameField.jsx'
import GameJoin from './GameJoin.jsx'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import MobileTabs from './components/MobileTabs.jsx'
import ResumedTransactionBanner from './components/ResumedTransactionBanner.jsx'
import GameDetails from './components/GameDetails.jsx'
import ActionFooter from './components/ActionFooter.jsx'
import { useDeviceBreakpoint } from './hooks/useDeviceBreakpoint.js'
import { usePendingTransaction } from './hooks/usePendingTransaction.js'
import { useGameSelection } from './hooks/useGameSelection.js'
import { deriveGameTypeId } from './gameTypes.js'

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

  const {
    activeGame,
    displayMode,
    opponentName,
    formattedAgo,
    isMyTurn,
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

  const {
    logs,
    pending,
    waiting,
    jsonPreview,
    handleSend,
    allMandatoryFilled,
  } = useExecuteHandler({ contract, fn, params, setParams, resumedTx })


  const handleMoveSelected = (cells) => {
    setSelectedCells(cells)
  }

  const handleSendMoveDummy = async () => {
    console.log('[Move] selectedCells:', selectedCells, 'game:', activeGame)
    await handleSend()
  }

  const handleJoin = async () => {
    console.log('[Join] game:', activeGame)

    await handleSend()
  }

  const handleCreate = async () => {
    console.log('[Create] game')
    await handleSend()
  }

  // const isGameMode = !!activeGame
  // const isSendEnabled = isGameMode
  //   ? selectedCells.length > 0 && !pending   // Only depend on selected cell
  //   : allMandatoryFilled && !pending         // Original behavior for non-game flow
  const isSendEnabled = allMandatoryFilled && !pending         // Original behavior for non-game flow
  const derivedGameTypeId = useMemo(() => deriveGameTypeId(fn?.name), [fn])

  return (
    <TerminalContainer title={fn.friendlyName}>
      <MobileTabs
        visible={isMobile}
        activePage={activePage}
        activeGame={activeGame}
        displayMode={displayMode}
        onChange={setActivePage}
      />

      <ResumedTransactionBanner tx={resumedTx} />

      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'unset',
          gridTemplateColumns: isMobile ? 'none' : '1fr 1fr',
          gap: isMobile ? '0' : '20px',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: !isMobile || activePage === 'form' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {!activeGame || displayMode == 'g_join' || displayMode == 'g_create' ? (
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
              description={fn.description}
              opponentName={opponentName}
              formattedAgo={formattedAgo}
              isMyTurn={isMyTurn}
              onBack={unselectGame}
            />
          )}

        </div>

        <div
          style={{
            display: !isMobile || activePage === 'preview' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {displayMode == 'g_join' ? (
            <GameJoin
              game={activeGame}
              setParams={setParams}
              user={user}
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
            />)}
        </div>
      </div>

      <ActionFooter
        displayMode={displayMode}
        pending={pending}
        isSendEnabled={isSendEnabled}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onMove={handleSendMoveDummy}
        onBackToMode={() => setStep(1)}
      />
    </TerminalContainer>
  )
}

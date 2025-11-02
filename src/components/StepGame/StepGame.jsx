// StepGame.jsx
import { useMemo, useState, useEffect } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import { useAioha } from '@aioha/react-ui'
import GameSelect from './GameSelect.jsx'
import GameField from './GameField.jsx'
import GameJoin from './GameJoin.jsx'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import NeonButton from '../buttons/NeonButton.jsx'
import { loadPendingTx } from '../../lib/txBridge.js'

export default function StepGame({
  contractId,
  fnName,
  params,
  setParams,
  setStep,
}) {
  const { user } = useAioha()
  const [isMobile, setIsMobile] = useState(false)
  const [activePage, setActivePage] = useState('form')
  const [resumedTx, setResumedTx] = useState(null)
  const [activeGame, setActiveGame] = useState(null)
  const [displayMode, setDisplayMode] = useState(null)
  const [selectedCells, setSelectedCells] = useState([])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setTimeout(() => {
      const pendingTx = loadPendingTx()
      if (pendingTx) {
        setResumedTx(pendingTx)
      }
    }, 800)
  }, [])

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

  const handleSendAndForward = async () => {
    if (isMobile && activePage !== 'preview') {
      setActivePage('preview')
    }
    await handleSend()
  }

  const handleGameSelected = (game, mode) => {
    console.log('Game selected: ', game, ' mode: ', mode)
    setDisplayMode(mode)
    if (game != null) {
      setActiveGame(game)
      setSelectedCells([])
      if (mode == 'g_join') {
      setParams({
        __gameIntentAmount: game.bet,
        __gameIntentAsset: game.asset,
        __gameFirstMovePurchase: game.firstMovePurchase,
        __gameId: game.id,
        __gameAction: 'g_join',
      })
    }
    if (mode == 'continue') {
      setParams({
        __gameId: game.id,
        __gameAction: 'g_move',
      })
    }
      
    }else{
      setActiveGame(null)
    }


    if (isMobile) setActivePage('preview') // TODO: handle mobile stuff
  }

  const handleUnselectGame = () => {
    setActiveGame(null)
    setDisplayMode(null)
    setSelectedCells([])
    if (isMobile) setActivePage('form')
  }

  const handleMoveSelected = (cells) => {
    setSelectedCells(cells)
  }

  const handleSendMoveDummy = async  () => {
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


  return (
    <TerminalContainer title={fn.friendlyName}>
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <NeonButton
            onClick={() => setActivePage('form')}
            style={{ opacity: activePage === 'form' ? 1 : 0.5 }}
          >
            INPUT
          </NeonButton>
          <NeonButton
            onClick={() => setActivePage('preview')}
            style={{ opacity: activePage === 'preview' ? 1 : 0.5 }}
          >
            Preview & Logs
          </NeonButton>
        </div>
      )}

      {resumedTx && (
        <div
          style={{
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid var(--color-primary-darker)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            marginBottom: '10px',
            color: '#00ff88',
          }}
        >
          🧩 Resumed transaction: <b>{resumedTx.fnName}</b> on <b>{resumedTx.contractId}</b>
        </div>
      )}

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
              onGameSelected={handleGameSelected}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '12px',
                textAlign: 'center',
                opacity: 0.9,
              }}
            >
              <div>Game selected. Switch to Preview ▶</div>
              <NeonButton onClick={handleUnselectGame} style={{ minWidth: '50%' }}>◀ Game Selection</NeonButton>
            </div>
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
            />)}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: '10px',
          gap: '12px',
          justifyContent: 'space-between',
          width: '100%',
          alignItems: 'center',
        }}
      >


        <NeonButton onClick={() => setStep(1)}>◀ Back</NeonButton>

        {
          displayMode == null ? (
            <p></p>
          ) :

            displayMode == 'g_create' ? (
              <NeonButton
                onClick={handleCreate}
                disabled={!isSendEnabled}
              >
                {pending ? 'Creating...' : 'Create Game ▶'}
              </NeonButton>
            ) :
              displayMode == 'g_join' ? (
                <NeonButton
                  onClick={handleJoin}
                  disabled={!isSendEnabled}
                >
                  {pending ? 'Joining...' : 'Join Game ▶'}
                </NeonButton>
              ) : (
                <NeonButton
                  onClick={handleSendMoveDummy}
                  disabled={!isSendEnabled}
                >
                  {pending ? 'Sending…' : 'Send Move ▶'}
                </NeonButton>
              )}
      </div>
    </TerminalContainer>
  )
}

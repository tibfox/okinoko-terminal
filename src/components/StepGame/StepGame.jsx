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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassStart, faCirclePlay, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { LatestGames } from "./GqlTest/GqlTest.jsx";


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
  const [opponentName, setOpponentName] = useState(null)
  const [formattedAgo, setFormattedAgo] = useState(null)
  const [isMyTurn, setIsMyTurn] = useState(null)
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


  const handleGameSelected = (game, mode) => {
    console.log('Game selected: ', game, ' mode: ', mode)
    setDisplayMode(mode)
    if (game != null) {
      setActiveGame(game)
      setSelectedCells([])
      const minsAgo = game.lastMoveMinutesAgo;
      const daysAgo = Math.floor(minsAgo / (24 * 60));
      const hoursAgo = Math.floor((minsAgo % (24 * 60)) / 60);
      const minutesAgo = minsAgo % 60;

      const timeAgo = `${hoursAgo.toString().padStart(2, '0')}h ${minutesAgo.toString().padStart(2, '0')}min`;
      setFormattedAgo(daysAgo > 0 ? `${daysAgo}d ${timeAgo}` : `${timeAgo}`)
      const fullUser = user.startsWith('hive:') ? user : `hive:${user}`
      setIsMyTurn(
        fullUser &&
        game &&
        ((fullUser === game.playerX && game.turn === '1') ||
          (fullUser === game.playerY && game.turn === '2')))

      if (game != null && fullUser != null) {
        setOpponentName(fullUser === game.playerX ? game.playerY : game.playerX)
      }


      if (mode == 'g_join') {
        setParams({
          __gameIntentAmount: game.bet,
          __gameIntentAsset: game.asset,
          __gameFirstMovePurchase: game.firstMovePurchase,
          __gameId: game.id,
          __gameAction: 'g_join',
        })
        if (isMobile) setActivePage('preview')
      }
      if (mode == 'continue') {
        setParams({
          __gameId: game.id,
          __gameAction: 'g_move',
        })
      }

    } else {
      setActiveGame(null)
    }



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
            {!activeGame ? "BROWSE" : displayMode == "g_join" ? "BROWSE" : "INFO"}
          </NeonButton>
          <NeonButton
            onClick={() => setActivePage('preview')}
            style={{ opacity: activePage === 'preview' ? 1 : 0.5 }}
          >
            {!activeGame ? "DETAILS" : displayMode == "g_join" ? "GAME INFO" : "BOARD"}
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
              isMobile={isMobile}
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
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: '20px' }}>{activeGame?.id}: {activeGame?.name}</h2>
                <center>    <table style={{ textAlign: 'left', tableLayout: 'auto', borderCollapse: 'collapse' }}>
                  {/* <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '70%' }} />itemAlign
                
              </colgroup> */}
                  <tbody>
                    <tr><td style={{ paddingRight: '10px' }}><strong>Opponent:</strong></td><td>{opponentName || ''}</td></tr>
                    <tr><td style={{ paddingRight: '10px' }}><strong>Prize Pool:</strong></td><td>
                      {activeGame?.bet > 0 ? `${activeGame?.bet * 2} ${activeGame?.asset}` : 'none'}
                    </td></tr>
                    <tr>
                      <td style={{ paddingRight: '10px' }}><strong>Turn:</strong></td>
                      <td>
                        {isMyTurn ? (
                          <>
                            <FontAwesomeIcon icon={faCirclePlay} style={{marginRight: '10px'}}/>
                            <strong>your turn</strong>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faHourglassStart} style={{marginRight: '10px'}}/>{opponentName || ''}
                          </>
                        )}
                      </td>
                    </tr>
                    <tr><td style={{ paddingRight: '10px' }}><strong>Last move:</strong></td><td>{formattedAgo || ''} ago</td></tr>
                  </tbody>
                </table></center>
                <div style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8, textAlign: 'justify' }}>
                  {fn.description}
                </div>
              </div>

              <NeonButton onClick={handleUnselectGame} style={{ minWidth: '50%' }}>
                <FontAwesomeIcon icon={faChevronLeft} style={{marginRight: '10px'}}/>
                Game List</NeonButton>
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
              handleResign={handleSend}
              handleTimeout={handleSend}
              isMobile={isMobile}


            />)}
        </div>
      </div>

<LatestGames />
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


        <NeonButton onClick={() => setStep(1)}>
          <FontAwesomeIcon icon={faChevronLeft} style={{marginRight: '10px'}}/>
          Game Mode</NeonButton>

        {
          displayMode == null ? (
            <p></p>
          ) :

            displayMode == 'g_create' ? (
              <NeonButton
                onClick={handleCreate}
                disabled={!isSendEnabled}
              >
                {pending ? ('Creating...' ): (<>
                    Create Game
                    <FontAwesomeIcon icon={faChevronRight} style={{marginLeft: '10px'}}/>
                  </>)}
              </NeonButton>
            ) :
              displayMode == 'g_join' ? (
                <NeonButton
                  onClick={handleJoin}
                  disabled={!isSendEnabled}
                >
                  {pending ? ('Joining...') : (<>
                    Join Game
                    <FontAwesomeIcon icon={faChevronRight} style={{marginLeft: '10px'}} />
                  </>)}
                </NeonButton>
              ) : (
                <NeonButton
                  onClick={handleSendMoveDummy}
                  disabled={!isSendEnabled}
                >
                  {pending ? (
                    'Sending…'
                  ) : (
                    <>
                      Send Move
                      <FontAwesomeIcon icon={faChevronRight} style={{marginLeft: '10px'}}/>
                    </>
                  )}
                </NeonButton>

              )}
      </div>
    </TerminalContainer>
  )
}

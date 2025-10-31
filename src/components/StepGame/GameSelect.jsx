// GameSelect.jsx
import { useState, useEffect } from 'preact/hooks'
import NeonButton from '../buttons/NeonButton.jsx'

export default function GameSelect({ user, contract, fn, onGameSelected }) {
  const [isMobile, setIsMobile] = useState(false)
  const [newGames, setNewGames] = useState([])
  const [continueGames, setContinueGames] = useState([])

  useEffect(() => {
    const allNewGames = [
      { id: 3, name: 'Testgame', creator: 'tibfox',      opponent: '',turn:'1',bet: 0.001, asset: 'HIVE', type: 'TTT', state: 'play',board: '000000000' },
      { id: 4, name: 'Testgame', creator: 'tibfox.vsc',  opponent: '',turn:'1',bet: 0.001, asset: 'HIVE', type: 'C4',  state: 'play',board: '000000000000000000000000000000000000000000' },
      { id: 5, name: 'Testgame', creator: 'tibfox',      opponent: '',turn:'1',bet: 0.001, asset: 'HIVE', type: 'G',   state: 'swap',board: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' },
      { id: 8, name: 'Testgame', creator: 'tibfox',      opponent: '',turn:'1',bet: 1.001, asset: 'HBD',  type: 'TTT', state: 'play',board: '000000000' },
      
    ]
    const allContinueGames = [
      { id: 7, name: 'Testgame', creator: 'diytube',      opponent: 'tibfox',turn:'1',bet: 1.001, asset: 'HBD',  type: 'TTT', state: 'play',board: '000010020' },
      { id: 6,name: 'Testgame',  creator: 'tibfox.vsc',  opponent: 'diytube',turn:'2',bet: 0.010, asset: 'HIVE', type: 'G',   state: 'play',board: '000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000010000000000000012000000000000012000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000' },
      { id: 1, name: 'Testgame', creator: 'tibfox',      opponent: 'diytube',turn:'2',bet: 0.001, asset: 'HIVE', type: 'TTT', state: 'play',board: '000000000' },
      { id: 2, name: 'Testgame', creator: 'diytube',  opponent: 'tibfox.vsc',turn:'1',bet: 1.001, asset: 'HBD',  type: 'C4',  state: 'play' ,board: '000000000000001000000100000010000002200000' },
      { id: 8, name: 'Testgame', creator: 'diytube',  opponent: 'tibfox.vsc',turn:'2',bet: 0.050, asset: 'HIVE', type: 'G',   state: 'swap' ,board:'000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000010000000000000012000000000000012000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000' },
    ]
    const typeKey = fn?.name
    setNewGames(allNewGames.filter(g => !typeKey || g.type === typeKey))
    setContinueGames(allContinueGames.filter(g => !typeKey || g.type === typeKey))
  }, [fn])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleJoin = (game) => onGameSelected?.(game)
  const handleLoad = (game) => onGameSelected?.(game)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingRight: isMobile ? '0' : '10px' }}>
      <table style={{ width: '100%', tableLayout: 'fixed' }}>
        <tbody>
          <tr><td><strong>User:</strong></td><td>{user}</td></tr>
          <tr><td><strong>Contract:</strong></td><td>{contract?.name}</td></tr>
          <tr><td><strong>Game Type:</strong></td><td>{fn?.friendlyName}</td></tr>
        </tbody>
      </table>

      {continueGames.length > 0 && (
        <>
          <h4>Continue a Game:</h4>
          <div class="game-selection-table">
            <table style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>ID</th>
                  <th style={{ width: '35%' }}>Creator</th>
                  <th style={{ width: '15%' }}>Bet</th>
                  <th style={{ width: '15%' }}>Asset</th>
                  <th style={{ width: '10%' }}>Type</th>
                  <th style={{ width: '15%' }}></th>
                </tr>
              </thead>
            </table>
            <div class="game-table-body">
              <table style={{ width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <tbody>
                  {continueGames.map(g => (
                    <tr key={g.id}>
                      <td>{g.id}</td>
                      <td>{g.creator}</td>
                      <td>{g.bet}</td>
                      <td>{g.asset}</td>
                      <td>{g.type}</td>
                      <td><NeonButton onClick={() => handleLoad(g)}>Load</NeonButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {newGames.length > 0 && (
        <>
          <h4>Join a new Game:</h4>
          <div class="game-selection-table">
            <table style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>ID</th>
                  <th style={{ width: '35%' }}>Creator</th>
                  <th style={{ width: '15%' }}>Bet</th>
                  <th style={{ width: '15%' }}>Asset</th>
                  <th style={{ width: '10%' }}>Type</th>
                  <th style={{ width: '15%' }}></th>
                </tr>
              </thead>
            </table>
            <div class="game-table-body">
              <table style={{ width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <tbody>
                  {newGames.map(g => (
                    <tr key={g.id}>
                      <td>{g.id}</td>
                      <td>{g.creator}</td>
                      <td>{g.bet}</td>
                      <td>{g.asset}</td>
                      <td>{g.type}</td>
                      <td><NeonButton onClick={() => onGameSelected?.(g)}>Join</NeonButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

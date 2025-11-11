import { useEffect, useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import DescriptionBox from '../common/DescriptionBox.jsx'
import FunctionList from './FunctionList.jsx'
import { getCookie, setCookie } from '../../lib/cookies.js'

const METADATA_COLLAPSE_COOKIE = 'contractMetadataCollapsed'

export default function ContractDetails({
  isMobile,
  selectedContract,
  selectedFunction,
  fnName,
  setFnName,
}) {
  if (!selectedContract) {
    return <p>Select a contract to view details.</p>
  }

  const isGameContract = selectedContract?.functions?.[0]?.parse === 'game'
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false)

  useEffect(() => {
    if (isMobile) return
    try {
      const cookieValue = getCookie(METADATA_COLLAPSE_COOKIE)
      if (cookieValue === '1') setIsMetadataCollapsed(true)
      if (cookieValue === '0') setIsMetadataCollapsed(false)
    } catch {}
  }, [isMobile])

  useEffect(() => {
    if (isMobile) return
    try {
      setCookie(
        METADATA_COLLAPSE_COOKIE,
        isMetadataCollapsed ? '1' : '0',
        365
      )
    } catch {}
  }, [isMetadataCollapsed, isMobile])

  const toggleMetadataVisibility = useCallback(() => {
    if (isMobile) return
    setIsMetadataCollapsed(prev => !prev)
  }, [isMobile])

  const handleMetadataHeaderKeyDown = useCallback(
    event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleMetadataVisibility()
      }
    },
    [toggleMetadataVisibility]
  )

  return (
    <div
      className="neon-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        gap: '12px',
        height: '100%',
      }}
    >
      {!isMobile && (
        <>
          <h3
            className="cyber-tile"
            style={{
              maxWidth: '60%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={toggleMetadataVisibility}
            onKeyDown={handleMetadataHeaderKeyDown}
            role="button"
            tabIndex={0}
            aria-expanded={!isMetadataCollapsed}
          >
            <span>Contract</span>
            <span style={{ marginLeft: 'auto', paddingRight: '8px' }}>
              <FontAwesomeIcon
                icon={isMetadataCollapsed ? faChevronDown : faChevronUp}
                style={{ fontSize: '0.9rem' }}
              />
            </span>
          </h3>
          {!isMetadataCollapsed && (
            <>
              <table
                style={{
                  borderSpacing: '0px 0px',
                  borderCollapse: 'separate',
                }}
              >
                <tbody>
                  <tr>
                    <td>
                      <strong>Contract Owner:</strong>
                    </td>
                    <td>
                      <a
                        href={`https://vsc.techcoderx.com/address/hive:${selectedContract.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedContract.owner}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Deployed On:</strong>
                    </td>
                    <td>{selectedContract.deployedOn}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Verified On:</strong>
                    </td>
                    <td>{selectedContract.verifiedOn}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>VSC ID:</strong>
                    </td>
                    <td>
                      <a
                        href={`https://vsc.techcoderx.com/contract/${selectedContract.vscId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedContract.vscId}
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>

              <DescriptionBox text={selectedContract.description} />
            </>
          )}
        </>
      )}

      {/* --- Functions Section --- */}
      {!isMobile && (
        <>
          {isGameContract ? (
            <h3 className="cyber-tile" style={{ maxWidth: '30%' }}>
              Games
            </h3>
          ) : (
            <h3 className="cyber-tile" style={{ maxWidth: '50%' }}>
              Functions
            </h3>
          )}
        </>
      )}
      <FunctionList
        selectedContract={selectedContract}
        fnName={fnName}
        setFnName={setFnName}
      />
      <DescriptionBox
        text={selectedFunction?.description}
        isMobile={isMobile}
      />
    </div>
  )
}
